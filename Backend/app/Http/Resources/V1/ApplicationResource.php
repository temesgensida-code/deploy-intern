<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Enums\ApplicationStatus;
use App\Models\Application;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Application
 */
class ApplicationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User|null $user */
        $user = $this->user;
        /** @var JobPost|null $jobPost */
        $jobPost = $this->jobPost;

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'job_post_id' => $this->job_post_id,
            'applicant' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'username' => $user->username,
                'cv_path' => $user->cv_path,
                'profile_photo_path' => $user->profile_photo_path,
                'profile_photo_url' => $user->profile_photo_url,
            ] : null,
            'job_post' => $jobPost ? [
                'id' => $jobPost->id,
                'title' => $jobPost->title,
                'slug' => $jobPost->slug,
                'job_type' => $jobPost->job_type->value,
                'job_type_label' => $jobPost->job_type->label(),
                'location' => $jobPost->location,
                'salary_min' => $jobPost->salary_min,
                'salary_max' => $jobPost->salary_max,
                'salary_currency' => $jobPost->salary_currency,
                'employer' => $jobPost->employer ? [
                    'id' => $jobPost->employer->id,
                    'company_name' => $jobPost->employer->company_name,
                    'logo' => $jobPost->employer->logo,
                ] : null,
            ] : null,
            'cv_path' => $this->cv_path,
            'cover_letter' => $this->cover_letter,
            'status' => $this->status->value,
            'status_label' => match ($this->status) {
                ApplicationStatus::SUBMITTED => 'Submitted',
                ApplicationStatus::UNDER_REVIEW => 'Under Review',
                ApplicationStatus::SHORTLISTED => 'Shortlisted',
                ApplicationStatus::REJECTED => 'Rejected',
                ApplicationStatus::HIRED => 'Hired',
            },
            'interview' => $this->interview ? new InterviewResource($this->interview) : null,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
