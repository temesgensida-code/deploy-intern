<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Jobs\AnalyzeEmployeeJobMatchesJob;
use App\Http\Resources\V1\UserResource;
use App\Models\EmployeeProfile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

class EmployeeProfileController extends Controller
{
    use ApiResponse;

    /**
     * Get the authenticated employee's profile and setup status.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        /** @var EmployeeProfile|null $profile */
        $profile = $user->employeeProfile;

        $completion = $this->calculateCompletion($user, $profile);

        return $this->success([
            'profile' => $profile,
            'completion' => $completion,
            'user' => new UserResource($user),
        ], 'Employee profile retrieved successfully');
    }

    /**
     * Update the authenticated employee's profile.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'headline' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:50'],
            'location' => ['nullable', 'string', 'max:100'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'skills' => ['nullable', 'array'],
            'skills.*' => ['string', 'max:60'],
            'experience' => ['nullable', 'array'],
            'education' => ['nullable', 'array'],
            'languages' => ['nullable', 'array'],
            'preferred_job_type' => ['nullable', 'string', 'max:50'],
            'photo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'profile_photo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ]);

        if ($request->hasFile('photo') || $request->hasFile('profile_photo')) {
            /** @var UploadedFile $photoFile */
            $photoFile = $request->file('photo') ?? $request->file('profile_photo');
            if ($user->profile_photo_path && Storage::disk('public')->exists($user->profile_photo_path)) {
                Storage::disk('public')->delete($user->profile_photo_path);
            }
            $savedPath = $photoFile->store('profile-photos', 'public');
            $user->update(['profile_photo_path' => $savedPath]);
        }

        /** @var EmployeeProfile $profile */
        $profile = $user->employeeProfile()->updateOrCreate(
            ['user_id' => $user->id],
            $validated
        );

        $completion = $this->calculateCompletion($user, $profile);

        // If profile has headline and skills, trigger background job to match all active published jobs
        if ($profile->isComplete()) {
            AnalyzeEmployeeJobMatchesJob::dispatch($user);
        }

        return $this->success([
            'profile' => $profile,
            'completion' => $completion,
            'user' => new UserResource($user),
        ], 'Profile updated successfully and matching analyzed');
    }

    /**
     * Calculate profile setup completion metrics and missing recommendations.
     *
     * @return array{is_complete: bool, percentage: int, missing_fields: list<string>}
     */
    protected function calculateCompletion(mixed $user, ?EmployeeProfile $profile): array
    {
        $missing = [];
        $totalWeight = 0;
        $earnedWeight = 0;

        $headline = $profile !== null ? ($profile->headline ?? '') : '';
        $location = $profile !== null ? ($profile->location ?? '') : '';
        $bio = $profile !== null ? ($profile->bio ?? '') : '';
        $skills = ($profile !== null && is_array($profile->skills)) ? array_filter($profile->skills) : [];

        // Headline (25%)
        $totalWeight += 25;
        if (! empty(trim($headline))) {
            $earnedWeight += 25;
        } else {
            $missing[] = 'headline';
        }

        // Skills (35%)
        $totalWeight += 35;
        if (count($skills) > 0) {
            $earnedWeight += 35;
        } else {
            $missing[] = 'skills';
        }

        // Location (15%)
        $totalWeight += 15;
        if (! empty(trim($location))) {
            $earnedWeight += 15;
        } else {
            $missing[] = 'location';
        }

        // Bio (15%)
        $totalWeight += 15;
        if (! empty(trim($bio))) {
            $earnedWeight += 15;
        } else {
            $missing[] = 'bio';
        }

        // CV uploaded (10%)
        $totalWeight += 10;
        if (! empty($user->cv_path)) {
            $earnedWeight += 10;
        } else {
            $missing[] = 'cv';
        }

        // Profile Photo (10%)
        $totalWeight += 10;
        if (! empty($user->profile_photo_path)) {
            $earnedWeight += 10;
        } else {
            $missing[] = 'photo';
        }

        $percentage = (int) round(($earnedWeight / $totalWeight) * 100);
        $isComplete = ! in_array('headline', $missing, true) && ! in_array('skills', $missing, true);

        return [
            'is_complete' => $isComplete,
            'percentage' => $percentage,
            'missing_fields' => $missing,
        ];
    }
}
