<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserNotificationPreferenceController extends Controller
{
    use ApiResponse;

    /**
     * Get the authenticated user's notification preferences.
     */
    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return $this->success([
            'email_notifications_enabled' => $user->wantsEmailNotifications(),
        ], 'Notification preferences retrieved successfully');
    }

    /**
     * Update the authenticated user's notification preferences.
     */
    public function update(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'email_notifications_enabled' => ['required', 'boolean'],
        ]);

        $user->update([
            'email_notifications_enabled' => (bool) $validated['email_notifications_enabled'],
        ]);

        return $this->success([
            'email_notifications_enabled' => $user->wantsEmailNotifications(),
        ], 'Notification preferences updated successfully');
    }
}
