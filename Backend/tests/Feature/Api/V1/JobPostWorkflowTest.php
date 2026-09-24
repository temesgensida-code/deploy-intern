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

    protected User $employerUser;

    protected Employer $employer;

    protected User $admin;

    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->employerUser = User::factory()->create([
            'role' => UserRole::EMPLOYER,
            'email_verified_at' => now(),
        ]);

        $this->employer = Employer::factory()->create([
            'user_id' => $this->employerUser->id,
            'approval_status' => 'approved',
        ]);

        $this->admin = User::factory()->create([
            'role' => UserRole::ADMIN,
            'email_verified_at' => now(),
        ]);

        $this->category = Category::factory()->create([
            'name' => 'Engineering',
            'slug' => 'engineering',
        ]);
    }

    public function test_employer_can_create_job_post_draft(): void
    {
        $response = $this->actingAs($this->employerUser)
            ->postJson('/api/v1/employer/jobs', [
                'category_id' => $this->category->id,
                'title' => 'Software Engineer',
                'description' => 'We are seeking a talented engineer to join our team.',
                'job_type' => JobType::FULL_TIME->value,
                'experience_level' => ExperienceLevel::MID->value,
                'location' => 'Addis Ababa',
                'is_remote' => false,
                'salary_min' => 1000,
                'salary_max' => 2000,
                'salary_currency' => 'USD',
                'requirements' => ['PHP', 'Laravel', 'PostgreSQL'],
                'responsibilities' => ['Build APIs', 'Write tests'],
                'submit_now' => false,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'title' => 'Software Engineer',
                    'status' => JobStatus::DRAFT->value,
                ],
            ]);

        $this->assertDatabaseHas('job_posts', [
            'title' => 'Software Engineer',
            'status' => JobStatus::DRAFT->value,
            'employer_id' => $this->employer->id,
        ]);
    }

    public function test_employer_can_create_and_submit_job_post_immediately(): void
    {
        $response = $this->actingAs($this->employerUser)
            ->postJson('/api/v1/employer/jobs', [
                'category_id' => $this->category->id,
                'title' => 'Product Manager',
                'description' => 'Lead product strategy and execution.',
                'job_type' => JobType::FULL_TIME->value,
                'experience_level' => ExperienceLevel::SENIOR->value,
                'submit_now' => true,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'title' => 'Product Manager',
                    'status' => JobStatus::PENDING_APPROVAL->value,
                ],
            ]);

        $this->assertDatabaseHas('job_posts', [
            'title' => 'Product Manager',
            'status' => JobStatus::PENDING_APPROVAL->value,
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
                    'status' => JobStatus::PENDING_APPROVAL->value,
                ],
            ]);

        $this->assertDatabaseHas('job_posts', [
            'id' => $job->id,
            'status' => JobStatus::PENDING_APPROVAL->value,
        ]);
    }

    public function test_admin_can_view_pending_job_posts(): void
    {
        JobPost::factory()->pending()->count(3)->create([
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/v1/admin/jobs/pending');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonCount(3, 'data.data');
    }

    public function test_admin_can_approve_pending_job_post(): void
    {
        $job = JobPost::factory()->pending()->create([
            'employer_id' => $this->employer->id,
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/jobs/{$job->id}/approve", [
                'expiration_days' => 45,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => JobStatus::PUBLISHED->value,
                ],
            ]);

        $this->assertDatabaseHas('job_posts', [
            'id' => $job->id,
            'status' => JobStatus::PUBLISHED->value,
        ]);

        $this->assertNotNull($job->fresh()->published_at);
        $this->assertNotNull($job->fresh()->expires_at);
    }

    public function test_admin_can_reject_pending_job_post_with_reason(): void
    {
        $job = JobPost::factory()->pending()->create([
            'employer_id' => $this->employer->id,
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/jobs/{$job->id}/reject", [
                'reason' => 'Job description does not meet platform quality guidelines.',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => JobStatus::REJECTED->value,
                    'rejection_reason' => 'Job description does not meet platform quality guidelines.',
                ],
            ]);

        $this->assertDatabaseHas('job_posts', [
            'id' => $job->id,
            'status' => JobStatus::REJECTED->value,
            'rejection_reason' => 'Job description does not meet platform quality guidelines.',
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

    public function test_employer_can_submit_published_job_post_to_repost_for_review(): void
    {
        $job = JobPost::factory()->published()->create([
            'employer_id' => $this->employer->id,
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->employerUser)
            ->postJson("/api/v1/employer/jobs/{$job->id}/submit");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', JobStatus::PENDING_APPROVAL->value);

        $this->assertDatabaseHas('job_posts', [
            'id' => $job->id,
            'status' => JobStatus::PENDING_APPROVAL->value,
            'rejection_reason' => null,
        ]);
    }

    public function test_employer_can_update_and_submit_published_job_post_via_submit_now(): void
    {
        $job = JobPost::factory()->published()->create([
            'employer_id' => $this->employer->id,
            'category_id' => $this->category->id,
            'title' => 'Old Published Title',
        ]);

        $response = $this->actingAs($this->employerUser)
            ->putJson("/api/v1/employer/jobs/{$job->id}", [
                'title' => 'New Reposted Title',
                'description' => 'Updated content for reposting this role properly.',
                'submit_now' => true,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.title', 'New Reposted Title')
            ->assertJsonPath('data.status', JobStatus::PENDING_APPROVAL->value);

        $this->assertDatabaseHas('job_posts', [
            'id' => $job->id,
            'title' => 'New Reposted Title',
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
