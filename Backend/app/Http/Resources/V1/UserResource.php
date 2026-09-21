<?php

namespace App\Http\Resources\V1;

use App\Models\Employer;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array..
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'username' => $this->username,
            'role' => $this->role?->value,
            'role_label' => $this->role?->label(),
            'is_suspended' => (bool) $this->is_suspended,
            'status' => $this->is_suspended ? 'Suspended' : 'Active',
            'profile_photo_path' => $this->profile_photo_path,
            'profile_photo_url' => $this->profile_photo_url,
            'email_verified_at' => $this->email_verified_at?->toDateTimeString(),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
            'employer' => $this->whenLoaded('employer', function (): ?array {
                /** @var Employer|null $employer */
                $employer = $this->employer;

                if (! $employer) {
                    return null;
                }

                return [
                    'id' => $employer->id,
                    'company_name' => $employer->company_name,
                    'logo' => $employer->logo,
                    'approval_status' => $employer->approval_status,
                ];
            }),
        ];
    }
}
