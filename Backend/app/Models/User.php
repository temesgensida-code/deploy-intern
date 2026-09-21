<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Notifications\V1\ResetPasswordNotification;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;
use Laravel\Sanctum\NewAccessToken;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string $username
 * @property UserRole|null $role
 * @property bool $is_suspended
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $remember_token
 * @property string|null $cv_path
 * @property string|null $cv_original_name
 * @property Carbon|null $cv_uploaded_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'username',
        'role',
        'is_suspended',
        'email_notifications_enabled',
        'password',
        'cv_path',
        'cv_original_name',
        'cv_uploaded_at',
        'email_verified_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'is_suspended' => 'boolean',
            'email_notifications_enabled' => 'boolean',
        ];
    }

    /**
     * Check if user is an Administrator.
     */
    public function isAdmin(): bool
    {
        return $this->role === UserRole::ADMIN;
    }

    /**
     * Check if user is an Employer.
     */
    public function isEmployer(): bool
    {
        return $this->role === UserRole::EMPLOYER;
    }

    /**
     * Check if user is an Employee.
     */
    public function isEmployee(): bool
    {
        return $this->role === UserRole::EMPLOYEE;
    }

    /**
     * Check if user has any of the specified roles.
     *
     * @param  UserRole|string|array<UserRole|string>  $roles
     */
    public function hasRole(UserRole|string|array $roles): bool
    {
        $roles = is_array($roles) ? $roles : [$roles];

        foreach ($roles as $role) {
            $roleValue = $role instanceof UserRole ? $role->value : $role;
            $userRoleValue = $this->role instanceof UserRole ? $this->role->value : $this->role;

            if ($userRoleValue === $roleValue) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check whether the user wants to receive email notifications.
     */
    public function wantsEmailNotifications(): bool
    {
        return (bool) ($this->email_notifications_enabled ?? true);
    }

    /**
     * Send the password reset notification.
     *
     * @param  string  $token
     * @return void
     */
    public function sendPasswordResetNotification($token)
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    /**
     * @return HasOne<Employer, $this>
     */
    public function employer(): HasOne
    {
        return $this->hasOne(Employer::class);
    }

    /**
     * @return HasMany<Application, $this>
     */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    /**
     * @return HasMany<SavedJob, $this>
     */
    public function savedJobs(): HasMany
    {
        return $this->hasMany(SavedJob::class);
    }

    /**
     * @return HasMany<Interview, $this>
     */
    public function interviews(): HasMany
    {
        return $this->hasMany(Interview::class);
    }

    /**
     * @return HasOne<EmployeeProfile, $this>
     */
    public function employeeProfile(): HasOne
    {
        return $this->hasOne(EmployeeProfile::class);
    }

    /**
     * @return HasMany<JobMatch, $this>
     */
    public function jobMatches(): HasMany
    {
        return $this->hasMany(JobMatch::class);
    }

    /**
     * Create a personal access token with custom expiration.
     */
    public function createAccessToken(bool $rememberMe = false): NewAccessToken
    {
        $newToken = $this->createToken('Personal Access Token');

        $expires = $rememberMe
            ? Carbon::now()->addMonths(6)
            : Carbon::now()->addDay();

        $token = $newToken->accessToken;
        $token->expires_at = $expires;
        $token->save();

        return $newToken;
    }
}
