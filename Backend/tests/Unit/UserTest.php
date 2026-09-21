<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_has_fillable_attributes(): void
    {
        $user = new User();

        $this->assertEquals(
            ['name', 'email', 'username', 'role', 'is_suspended', 'email_notifications_enabled', 'password', 'cv_path', 'cv_original_name', 'cv_uploaded_at', 'email_verified_at'],
            $user->getFillable()
        );
    }

    public function test_user_has_hidden_attributes(): void
    {
        $user = new User();

        $this->assertEquals(
            ['password', 'remember_token'],
            $user->getHidden()
        );
    }

    public function test_user_password_is_hashed(): void
    {
        $user = User::factory()->create([
            'password' => 'plain-password',
        ]);

        $this->assertNotEquals('plain-password', $user->password);
        $this->assertTrue(Hash::check('plain-password', $user->password));
    }

    public function test_user_implements_must_verify_email(): void
    {
        $user = new User();

        $this->assertInstanceOf(
            MustVerifyEmail::class,
            $user
        );
    }

    public function test_user_can_create_token(): void
    {
        $user = User::factory()->create();

        $token = $user->createToken('test-token');

        $this->assertNotNull($token);
        $this->assertNotNull($token->plainTextToken);
    }

    public function test_user_factory_creates_valid_user(): void
    {
        $user = User::factory()->create();

        $this->assertNotNull($user->name);
        $this->assertNotNull($user->email);
        $this->assertNotNull($user->username);
        $this->assertNotNull($user->password);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_user_factory_can_create_unverified(): void
    {
        $user = User::factory()->unverified()->create();

        $this->assertNull($user->email_verified_at);
        $this->assertFalse($user->hasVerifiedEmail());
    }

    public function test_user_email_is_unique(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->assertDatabaseHas('users', ['email' => 'taken@example.com']);

        $this->expectException(QueryException::class);

        User::factory()->create(['email' => 'taken@example.com']);
    }

    public function test_user_username_is_unique(): void
    {
        User::factory()->create(['username' => 'taken']);

        $this->assertDatabaseHas('users', ['username' => 'taken']);

        $this->expectException(QueryException::class);

        User::factory()->create(['username' => 'taken']);
    }
}
