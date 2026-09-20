<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Employer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCompanyManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $employerUser;

    private Employer $employer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => UserRole::ADMIN,
            'email_verified_at' => now(),
        ]);

        $this->employerUser = User::factory()->create([
            'role' => UserRole::EMPLOYER,
            'email_verified_at' => now(),
        ]);

        $this->employer = Employer::create([
            'user_id' => $this->employerUser->id,
            'company_name' => 'Acme Corp',
            'email' => 'contact@acme.com',
            'phone' => '+251911223344',
            'location' => 'Addis Ababa',
            'industry' => 'Technology',
            'company_size' => '51–200 employees',
            'approval_status' => 'pending',
        ]);
    }

    public function test_admin_can_view_companies_list(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson('/api/v1/admin/companies');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'companies' => ['data'],
                    'stats' => ['total_companies', 'approved_companies', 'pending_companies', 'rejected_companies', 'total_jobs'],
                ],
            ]);
    }

    public function test_admin_can_filter_companies_by_status(): void
    {
        Employer::create([
            'user_id' => User::factory()->create(['role' => UserRole::EMPLOYER])->id,
            'company_name' => 'Approved Tech',
            'approval_status' => 'approved',
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/v1/admin/companies?status=approved');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data.companies.data')
            ->assertJsonPath('data.companies.data.0.company_name', 'Approved Tech');
    }

    public function test_admin_can_view_company_details(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/companies/{$this->employer->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.company_name', 'Acme Corp');
    }

    public function test_admin_can_approve_company(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/companies/{$this->employer->id}/approve");

        $response->assertStatus(200)
            ->assertJsonPath('data.approval_status', 'approved');

        $this->assertDatabaseHas('employers', [
            'id' => $this->employer->id,
            'approval_status' => 'approved',
        ]);
    }

    public function test_admin_can_approve_company_via_approved_alias(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/companies/{$this->employer->id}/approved");

        $response->assertStatus(200)
            ->assertJsonPath('data.approval_status', 'approved');

        $this->assertDatabaseHas('employers', [
            'id' => $this->employer->id,
            'approval_status' => 'approved',
        ]);
    }

    public function test_admin_can_reject_company(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/companies/{$this->employer->id}/reject");

        $response->assertStatus(200)
            ->assertJsonPath('data.approval_status', 'rejected');

        $this->assertDatabaseHas('employers', [
            'id' => $this->employer->id,
            'approval_status' => 'rejected',
        ]);
    }

    public function test_admin_can_reject_company_via_rejected_alias(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/companies/{$this->employer->id}/rejected");

        $response->assertStatus(200)
            ->assertJsonPath('data.approval_status', 'rejected');

        $this->assertDatabaseHas('employers', [
            'id' => $this->employer->id,
            'approval_status' => 'rejected',
        ]);
    }

    public function test_admin_can_update_company_profile_details(): void
    {
        $response = $this->actingAs($this->admin)
            ->putJson("/api/v1/admin/companies/{$this->employer->id}", [
                'company_name' => 'Acme Global Technologies',
                'location' => 'Bole, Addis Ababa',
                'industry' => 'Fintech',
                'company_size' => '500+ employees',
                'description' => 'Leading financial technology solutions provider.',
                'website' => 'https://acme-global.com',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.company_name', 'Acme Global Technologies')
            ->assertJsonPath('data.industry', 'Fintech');

        $this->assertDatabaseHas('employers', [
            'id' => $this->employer->id,
            'company_name' => 'Acme Global Technologies',
            'industry' => 'Fintech',
        ]);
    }

    public function test_admin_can_update_company_status_patch(): void
    {
        $response = $this->actingAs($this->admin)
            ->patchJson("/api/v1/admin/companies/{$this->employer->id}/status", [
                'approval_status' => 'approved',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.approval_status', 'approved');
    }

    public function test_admin_can_delete_company(): void
    {
        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/v1/admin/companies/{$this->employer->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('employers', ['id' => $this->employer->id]);
    }

    public function test_non_admin_cannot_access_admin_companies(): void
    {
        $response = $this->actingAs($this->employerUser)
            ->getJson('/api/v1/admin/companies');

        $response->assertStatus(403);
    }
}
