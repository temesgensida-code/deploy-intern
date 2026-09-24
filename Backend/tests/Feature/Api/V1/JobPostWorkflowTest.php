<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Enums\ExperienceLevel;
use App\Enums\JobStatus;
use App\Enums\JobType;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Employer;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobPostWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $employerUser;

    private Employer $employer;

    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => UserRole::ADMIN->value,
            'email_verified_at' => now(),
        ]);

        $this->employerUser = User::factory()->create([
            'role' => UserRole::EMPLOYER->value,
            'email_verified_at' => now(),
        ]);

        $this->employer = Employer::factory()->create([
            'user_id' => $this->employerUser->id,
        ]);

        $this->category = Category::factory()->create();
    }

    public function test_employer_can_create_job_post_draft(): void
    {
        $payload = [
            'category_id' => $this->category->id,
            'title' => 'Senior Backend Developer',
            'description' => 'We are seeking a senior backend developer skilled in Laravel and clean architecture.',
            'requirements' => ['5+ years PHP experience', 'Laravel expertise'],
            'responsibilities' => ['Design APIs', 'Write unit tests'],
            'job_type' => JobType::FULL_TIME->value,
            'experience_level' => ExperienceLevel::SENIOR->value,
            'location' => 'Addis Ababa',
            'salary_min' => 60000,
            'salary_max' => 90000,
            'salary_currency' => 'USD',
            'is_remote' => true,
            'submit_now' => false,
        ];

        $response = $this->actingAs($this->employerUser)
            ->postJson('/api/v1/employer/jobs', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'title' => 'Senior Backend Developer',
                    'status' => JobStatus::DRAFT->value,
                    'employer_id' => $this->employer->id,
                ],
            ]);

        $this->assertDatabaseHas('job_posts', [
            'title' => 'Senior Backend Developer',
            'status' => JobStatus::DRAFT->value,
        ]);
    }

    public function test_employer_can_create_and_submit_job_post_immediately(): void
    {
        $payload = [
            'category_id' => $this->category->id,
            'title' => 'Frontend React Engineer',
            'description' => 'Looking for a passionate frontend engineer to build responsive modern UI components.',
            'job_type' => JobType::REMOTE->value,
            'experience_level' => ExperienceLevel::MID->value,
            'submit_now' => true,
        ];

        $response = $this->actingAs($this->employerUser)
            ->postJson('/api/v1/employer/jobs', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => JobStatus::PENDING_APPROVAL->value,
                ],
            ]);
    }

    public function test_employer_can_submit_draft_job_post_for_review(): void
    {
        $job = JobPost::factory()->create([
            'employer_id' => $this->employer->id,
            'category_id' => $this->category->id,
            'status' => JobStatus::DRAFT,
        ]);

        $response = $this->actingAs($this->employerUser)
            ->postJson("/api/v1/employer/jobs/{$job->id}/submit");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $job->id,
                    'status' => JobStatus::PENDING_APPROVAL->value,
                ],
            ]);
    }

    public function test_admin_can_view_pending_job_posts(): void
    {
        JobPost::factory()->pending()->create([
            'employer_id' => $this->employer->id,
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/v1/admin/jobs/pending');

        $response->assertStatus(200)
            ->assertJsonPath('data.data.0.status', JobStatus::PENDING_APPROVAL->value);
    }

    public function test_admin_can_approve_pending_job_post(): void
    {
        $job = JobPost::factory()->pending()->create([
            'employer_id' => $this->employer->id,
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/jobs/{$job->id}/approve");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $job->id,
                    'status' => JobStatus::PUBLISHED->value,
                ],
            ]);

        $this->assertDatabaseHas('job_posts', [
            'id' => $job->id,
            'status' => JobStatus::PUBLISHED->value,
        ]);
    }

    public function test_admin_can_reject_pending_job_post_with_reason(): void
    {
        $job = JobPost::factory()->pending()->create([
            'employer_id' => $this->employer->id,
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/jobs/{$job->id}/reject", [
                'reason' => 'Description lacks required job qualification details.',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $job->id,
                    'status' => JobStatus::REJECTED->value,
                    'rejection_reason' => 'Description lacks required job qualification details.',
                ],
            ]);
    }

    public function test_employer_can_view_rejection_reason_for_rejected_job_posts(): void
    {
        JobPost::factory()->rejected('Salary details and requirements are unclear.')->create([
            'employer_id' => $this->employer->id,
            'category_id' => $this->category->id,
            'title' => 'Rejected Frontend Role',
        ]);

        $response = $this->actingAs($this->employerUser)
            ->getJson('/api/v1/employer/jobs');

        $response->assertStatus(200)
            ->assertJsonPath('data.data.0.status', JobStatus::REJECTED->value)
            ->assertJsonPath('data.data.0.rejection_reason', 'Salary details and requirements are unclear.');
    }

    public function test_employer_can_resubmit_rejected_job_post(): void
    {
        $job = JobPost::factory()->rejected('Missing details')->create([
            'employer_id' => $this->employer->id,
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->employerUser)
            ->postJson("/api/v1/employer/jobs/{$job->id}/submit");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => JobStatus::PENDING_APPROVAL->value,
                ],
            ]);

        $this->assertDatabaseHas('job_posts', [
            'id' => $job->id,
            'status' => JobStatus::PENDING_APPROVAL->value,
            'rejection_reason' => null,
        ]);
    }

    public function test_employer_can_close_published_job_post(): void
    {
        $job = JobPost::factory()->published()->create([
            'employer_id' => $this->employer->id,
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->employerUser)
            ->postJson("/api/v1/employer/jobs/{$job->id}/close");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => JobStatus::CLOSED->value,
                ],
            ]);
    }

    public function test_public_user_can_browse_published_jobs_only(): void
    {
        JobPost::factory()->published()->create([
            'title' => 'Visible Published Job',
            'category_id' => $this->category->id,
        ]);

        JobPost::factory()->create([
            'title' => 'Hidden Draft Job',
            'status' => JobStatus::DRAFT,
            'category_id' => $this->category->id,
        ]);

        $response = $this->getJson('/api/v1/jobs');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.title', 'Visible Published Job');
    }

    public function test_public_user_cannot_view_draft_job_details(): void
    {
        $draftJob = JobPost::factory()->create([
            'status' => JobStatus::DRAFT,
            'category_id' => $this->category->id,
        ]);

        $response = $this->getJson("/api/v1/jobs/{$draftJob->slug}");

        $response->assertStatus(403);
    }

    public function test_job_post_search_and_filtering(): void
    {
        JobPost::factory()->published()->create([
            'title' => 'DevOps Cloud Engineer',
            'job_type' => JobType::FULL_TIME,
            'experience_level' => ExperienceLevel::SENIOR,
            'category_id' => $this->category->id,
        ]);

        JobPost::factory()->published()->create([
            'title' => 'Graphic UI Designer',
            'job_type' => JobType::CONTRACT,
            'experience_level' => ExperienceLevel::ENTRY,
            'category_id' => $this->category->id,
        ]);

        $response = $this->getJson('/api/v1/jobs?search=DevOps&job_type=full_time');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.title', 'DevOps Cloud Engineer');
    }

    public function test_admin_can_list_all_job_posts_with_status_filter(): void
    {
        JobPost::factory()->published()->create([
            'title' => 'Published Job',
            'category_id' => $this->category->id,
        ]);

        JobPost::factory()->pending()->create([
            'title' => 'Pending Job',
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/v1/admin/jobs?status=pending_approval');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.title', 'Pending Job');
    }

    public function test_admin_can_delete_job_post(): void
    {
        $job = JobPost::factory()->published()->create([
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/v1/admin/jobs/{$job->id}");

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertSoftDeleted('job_posts', [
            'id' => $job->id,
        ]);
    }

    public function test_employer_can_update_published_job_post(): void
    {
        $job = JobPost::factory()->published()->create([
            'employer_id' => $this->employer->id,
            'category_id' => $this->category->id,
            'title' => 'Original Title',
        ]);

        $response = $this->actingAs($this->employerUser)
            ->putJson("/api/v1/employer/jobs/{$job->id}", [
                'title' => 'Updated Title',
                'description' => 'Updated description with sufficient text length.',
                'requirements' => "Skill 1\nSkill 2\nSkill 3",
                'responsibilities' => "Task 1\nTask 2",
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.title', 'Updated Title')
            ->assertJsonPath('data.requirements.0', 'Skill 1')
            ->assertJsonPath('data.responsibilities.1', 'Task 2');

        $this->assertDatabaseHas('job_posts', [
            'id' => $job->id,
            'title' => 'Updated Title',
        ]);
    }

    public function test_employer_can_update_pending_job_post(): void
    {
        $job = JobPost::factory()->pending()->create([
            'employer_id' => $this->employer->id,
            'category_id' => $this->category->id,
            'title' => 'Pending Job Title',
        ]);

        $response = $this->actingAs($this->employerUser)
            ->putJson("/api/v1/employer/jobs/{$job->id}", [
                'title' => 'Updated Pending Title',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.title', 'Updated Pending Title');
    }

    public function test_employer_can_submit_closed_job_post_to_repost(): void
    {
        $job = JobPost::factory()->create([
            'employer_id' => $this->employer->id,
            'category_id' => $this->category->id,
            'status' => JobStatus::CLOSED,
        ]);

        $response = $this->actingAs($this->employerUser)
            ->postJson("/api/v1/employer/jobs/{$job->id}/submit");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', JobStatus::PENDING_APPROVAL->value);

        $this->assertDatabaseHas('job_posts', [
            'id' => $job->id,
            'status' => JobStatus::PENDING_APPROVAL->value,
        ]);
    }

    public function test_employer_can_reopen_closed_job_post(): void
    {
        $job = JobPost::factory()->create([
            'employer_id' => $this->employer->id,
            'category_id' => $this->category->id,
            'status' => JobStatus::CLOSED,
        ]);

        $response = $this->actingAs($this->employerUser)
            ->postJson("/api/v1/employer/jobs/{$job->id}/reopen");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', JobStatus::PUBLISHED->value);

        $this->assertDatabaseHas('job_posts', [
            'id' => $job->id,
            'status' => JobStatus::PUBLISHED->value,
        ]);
    }

    public function test_employer_cannot_update_another_employers_job_post(): void
    {
        $otherEmployer = Employer::factory()->create();
        $job = JobPost::factory()->published()->create([
            'employer_id' => $otherEmployer->id,
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->employerUser)
            ->putJson("/api/v1/employer/jobs/{$job->id}", [
                'title' => 'Malicious Update',
            ]);

        $response->assertStatus(403);
    }
}
