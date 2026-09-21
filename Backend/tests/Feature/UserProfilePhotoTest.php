<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Employer;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UserProfilePhotoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private function createFakeImage(string $name = 'avatar.png'): UploadedFile
    {
        $pngBytes = (string) base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

        return UploadedFile::fake()->createWithContent($name, $pngBytes);
    }

    public function test_authenticated_user_can_upload_profile_photo(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::EMPLOYEE,
        ]);

        $file = $this->createFakeImage('avatar.png');

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/user/profile-photo', [
                'photo' => $file,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'profile_photo_path',
                    'profile_photo_url',
                    'user' => [
                        'id',
                        'name',
                        'profile_photo_path',
                        'profile_photo_url',
                    ],
                ],
            ]);

        $user->refresh();
        $this->assertNotNull($user->profile_photo_path);
        Storage::disk('public')->assertExists($user->profile_photo_path);
    }

    public function test_reuploading_photo_deletes_previous_file_from_storage(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::EMPLOYEE,
        ]);

        $file1 = $this->createFakeImage('first.png');
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/user/profile-photo', ['photo' => $file1]);
        $user->refresh();
        $oldPath = $user->profile_photo_path;
        Storage::disk('public')->assertExists($oldPath);

        $file2 = $this->createFakeImage('second.png');
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/user/profile-photo', ['photo' => $file2]);
        $user->refresh();
        $newPath = $user->profile_photo_path;

        $this->assertNotEquals($oldPath, $newPath);
        Storage::disk('public')->assertMissing($oldPath);
        Storage::disk('public')->assertExists($newPath);
    }

    public function test_user_can_remove_profile_photo(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::EMPLOYEE,
        ]);

        $file = $this->createFakeImage('avatar.png');
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/user/profile-photo', ['photo' => $file]);
        $user->refresh();
        $path = $user->profile_photo_path;
        Storage::disk('public')->assertExists($path);

        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/v1/user/profile-photo');
        $response->assertOk();

        $user->refresh();
        $this->assertNull($user->profile_photo_path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_invalid_file_type_is_rejected(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::EMPLOYEE,
        ]);

        $file = UploadedFile::fake()->create('document.pdf', 500, 'application/pdf');

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/user/profile-photo', [
                'photo' => $file,
            ]);

        $response->assertStatus(422);
    }

    public function test_unauthenticated_user_cannot_upload_photo(): void
    {
        $file = $this->createFakeImage('avatar.png');

        $response = $this->postJson('/api/v1/user/profile-photo', [
            'photo' => $file,
        ]);

        $response->assertUnauthorized();
    }

    public function test_application_resource_exposes_applicant_profile_photo(): void
    {
        $employerUser = User::factory()->create(['role' => UserRole::EMPLOYER]);
        $employer = Employer::factory()->create(['user_id' => $employerUser->id]);
        $jobPost = JobPost::factory()->create(['employer_id' => $employer->id]);

        $candidate = User::factory()->create([
            'role' => UserRole::EMPLOYEE,
            'profile_photo_path' => 'profile-photos/candidate_test.jpg',
        ]);

        $application = Application::factory()->create([
            'job_post_id' => $jobPost->id,
            'user_id' => $candidate->id,
        ]);

        $response = $this->actingAs($employerUser, 'sanctum')
            ->getJson("/api/v1/employer/applications/{$application->id}");

        $response->assertOk()
            ->assertJsonPath('data.applicant.profile_photo_path', 'profile-photos/candidate_test.jpg')
            ->assertJsonPath('data.applicant.profile_photo_url', Storage::disk('public')->url('profile-photos/candidate_test.jpg'));
    }
}
