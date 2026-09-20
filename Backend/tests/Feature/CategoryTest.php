<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_category(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->postJson('/api/v1/categories', [
            'name' => 'Software Engineering',
            'description' => 'Roles related to software development',
            'icon' => '💻',
            'display_order' => 1,
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Software Engineering',
                    'slug' => 'software-engineering',
                ],
            ]);
    }

    public function test_create_category_with_duplicate_name_fails(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Category::factory()->create(['name' => 'Software Engineering']);

        $response = $this->actingAs($admin)->postJson('/api/v1/categories', [
            'name' => 'Software Engineering',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    public function test_admin_can_update_category(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $category = Category::factory()->create(['name' => 'Old Name Here']);

        $response = $this->actingAs($admin)
            ->putJson("/api/v1/categories/{$category->id}", ['name' => 'New Name Here']);

        $response->assertStatus(200)
            ->assertJson(['data' => ['name' => 'New Name Here']]);
    }

    public function test_index_lists_only_active_categories(): void
    {
        Category::factory()->create(['name' => 'Active Category One', 'is_active' => true]);
        Category::factory()->create(['name' => 'Inactive Category Two', 'is_active' => false]);

        $response = $this->getJson('/api/v1/categories');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['name' => 'Active Category One']);
    }

    public function test_index_auto_seeds_categories_when_empty(): void
    {
        $this->assertEquals(0, Category::count());

        $response = $this->getJson('/api/v1/categories');

        $response->assertStatus(200);
        $this->assertGreaterThan(0, Category::count());
        $this->assertDatabaseHas('categories', ['slug' => 'software-it']);
    }

    public function test_admin_index_lists_all_categories(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Category::factory()->create(['name' => 'Active Category One', 'is_active' => true]);
        Category::factory()->create(['name' => 'Inactive Category Two', 'is_active' => false]);

        $response = $this->actingAs($admin)->getJson('/api/v1/admin/categories');

        $response->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_destroy_soft_deletes_category(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $category = Category::factory()->create(['is_active' => true]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/categories/{$category->id}");

        $response->assertStatus(200);
        $this->assertDatabaseHas('categories', ['id' => $category->id, 'is_active' => false]);
    }

    public function test_non_admin_cannot_create_category(): void
    {
        $jobSeeker = User::factory()->create(['role' => 'employee']);

        $response = $this->actingAs($jobSeeker)->postJson('/api/v1/categories', [
            'name' => 'Should Not Be Created',
        ]);

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_access_admin_categories(): void
    {
        $response = $this->getJson('/api/v1/admin/categories');

        $response->assertStatus(401);
    }

    public function test_non_admin_cannot_access_admin_categories(): void
    {
        $jobSeeker = User::factory()->create(['role' => 'employee']);

        $response = $this->actingAs($jobSeeker)->getJson('/api/v1/admin/categories');

        $response->assertStatus(403);
    }
}
