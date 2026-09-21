<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\UserResource;
use App\Http\Traits\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UserProfilePhotoController extends Controller
{
    use ApiResponse;

    /**
     * Upload and update the authenticated user's profile photo.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'profile_photo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ]);

        $file = $request->file('photo') ?? $request->file('profile_photo');

        if (! $file) {
            return $this->error('Please select an image file to upload.', 422);
        }

        /** @var User $user */
        $user = $request->user();

        // Delete existing photo if exists on public disk
        if ($user->profile_photo_path && Storage::disk('public')->exists($user->profile_photo_path)) {
            Storage::disk('public')->delete($user->profile_photo_path);
        }

        $path = $file->store('profile-photos', 'public');

        $user->update([
            'profile_photo_path' => $path,
        ]);

        return $this->success([
            'profile_photo_path' => $path,
            'profile_photo_url' => $user->profile_photo_url,
            'user' => new UserResource($user),
        ], 'Profile photo uploaded successfully');
    }

    /**
     * Remove the authenticated user's profile photo.
     */
    public function destroy(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->profile_photo_path && Storage::disk('public')->exists($user->profile_photo_path)) {
            Storage::disk('public')->delete($user->profile_photo_path);
        }

        $user->update([
            'profile_photo_path' => null,
        ]);

        return $this->success([
            'user' => new UserResource($user),
        ], 'Profile photo removed successfully');
    }
}
