<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\ApplicationStatus;
use App\Enums\JobStatus;
use App\Enums\UserRole;
use App\Models\Application;
use App\Models\Employer;
use App\Models\Interview;
use App\Models\JobPost;
use App\Models\User;
use App\Notifications\V1\Admin\EmployerPendingApprovalNotification;
use App\Notifications\V1\Admin\JobSubmittedForReviewNotification;
use App\Notifications\V1\Employee\ApplicationStatusChangedNotification;
use App\Notifications\V1\Employee\InterviewScheduledNotification;
use App\Notifications\V1\Employee\JobMatchNotification;
use App\Notifications\V1\Employer\EmployerApprovedNotification;
use App\Notifications\V1\Employer\EmployerRejectedNotification;
use App\Notifications\V1\Employer\JobPostApprovedNotification;
use App\Notifications\V1\Employer\JobPostRejectedNotification;
use App\Notifications\V1\Employer\NewApplicationReceivedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Messages\MailMessage;
use Tests\TestCase;

class NotificationEmailPreferencesTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_retrieve_notification_preferences(): void
    {
        $user = User::factory()->create([
            'email_notifications_enabled' => true,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/user/notification-preferences');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.email_notifications_enabled', true);
    }

    public function test_authenticated_user_can_disable_and_enable_email_notifications(): void
    {
        $user = User::factory()->create([
            'email_notifications_enabled' => true,
        ]);

        // Disable email notifications
        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/user/notification-preferences', [
                'email_notifications_enabled' => false,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.email_notifications_enabled', false);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email_notifications_enabled' => false,
        ]);

        // Re-enable email notifications
        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/user/notification-preferences', [
                'email_notifications_enabled' => true,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.email_notifications_enabled', true);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email_notifications_enabled' => true,
        ]);
    }

    public function test_preference_update_validates_boolean(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/user/notification-preferences', [
                'email_notifications_enabled' => 'not-a-boolean',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email_notifications_enabled']);
    }

    public function test_unauthenticated_user_cannot_access_preferences(): void
    {
        $response = $this->getJson('/api/v1/user/notification-preferences');
        $response->assertStatus(401);

        $response = $this->putJson('/api/v1/user/notification-preferences', [
            'email_notifications_enabled' => false,
        ]);
        $response->assertStatus(401);
    }

    public function test_notification_channels_respect_user_email_preferences(): void
    {
        $userWithEmail = User::factory()->create(['email_notifications_enabled' => true]);
        $userWithoutEmail = User::factory()->create(['email_notifications_enabled' => false]);

        $employer = Employer::factory()->create();
        $job = JobPost::factory()->create(['employer_id' => $employer->id]);

        $notification = new JobPostApprovedNotification($job);

        // When enabled: database + mail
        $this->assertEquals(['database', 'mail'], $notification->via($userWithEmail));

        // When disabled: database only
        $this->assertEquals(['database'], $notification->via($userWithoutEmail));
    }

    public function test_all_scenarios_generate_valid_mail_messages(): void
    {
        $admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $employerUser = User::factory()->create(['role' => UserRole::EMPLOYER]);
        $employee = User::factory()->create(['role' => UserRole::EMPLOYEE]);

        $employer = Employer::factory()->create(['user_id' => $employerUser->id]);
        $job = JobPost::factory()->create(['employer_id' => $employer->id, 'status' => JobStatus::PUBLISHED]);
        $application = Application::factory()->create(['job_post_id' => $job->id, 'user_id' => $employee->id]);
        $interview = Interview::factory()->create([
            'application_id' => $application->id,
            'job_post_id' => $job->id,
            'employer_id' => $employer->id,
        ]);

        // 1. Admin - Employer pending
        $n1 = new EmployerPendingApprovalNotification($employer);
        $mail1 = $n1->toMail($admin);
        $this->assertInstanceOf(MailMessage::class, $mail1);
        $this->assertStringContainsString('Pending Review', $mail1->subject);

        // 2. Admin - Job submitted
        $n2 = new JobSubmittedForReviewNotification($job);
        $mail2 = $n2->toMail($admin);
        $this->assertInstanceOf(MailMessage::class, $mail2);
        $this->assertStringContainsString('Pending Review', $mail2->subject);

        // 3. Employer - Approved
        $n3 = new EmployerApprovedNotification($employer);
        $mail3 = $n3->toMail($employerUser);
        $this->assertInstanceOf(MailMessage::class, $mail3);
        $this->assertStringContainsString('Approved', $mail3->subject);

        // 4. Employer - Rejected
        $n4 = new EmployerRejectedNotification($employer);
        $mail4 = $n4->toMail($employerUser);
        $this->assertInstanceOf(MailMessage::class, $mail4);

        // 5. Employer - Job approved
        $n5 = new JobPostApprovedNotification($job);
        $mail5 = $n5->toMail($employerUser);
        $this->assertInstanceOf(MailMessage::class, $mail5);

        // 6. Employer - Job rejected
        $n6 = new JobPostRejectedNotification($job, 'Spam content detected');
        $mail6 = $n6->toMail($employerUser);
        $this->assertInstanceOf(MailMessage::class, $mail6);

        // 7. Employer - New application
        $n7 = new NewApplicationReceivedNotification($application, $job, $employee);
        $mail7 = $n7->toMail($employerUser);
        $this->assertInstanceOf(MailMessage::class, $mail7);

        // 8. Employee - Status changed
        $n8 = new ApplicationStatusChangedNotification($application, $job, ApplicationStatus::SHORTLISTED);
        $mail8 = $n8->toMail($employee);
        $this->assertInstanceOf(MailMessage::class, $mail8);

        // 9. Employee - Interview scheduled
        $n9 = new InterviewScheduledNotification($interview);
        $mail9 = $n9->toMail($employee);
        $this->assertInstanceOf(MailMessage::class, $mail9);

        // 10. Employee - Job match
        $n10 = new JobMatchNotification($job, 92, ['matched_skills' => ['PHP', 'Laravel']]);
        $mail10 = $n10->toMail($employee);
        $this->assertInstanceOf(MailMessage::class, $mail10);
    }
}
