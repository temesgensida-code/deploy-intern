<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'temesgensidatst@gmail.com'],
            [
                'name' => 'temesgen sida',
                'username' => 'temesgensida',
                'password' => Hash::make('Te1to2ge3si4'),
                'role' => UserRole::ADMIN,
                'email_verified_at' => now(),
            ]
        );

        User::updateOrCreate(
            ['email' => 'lidiyanaa98@gmail.com'],
            [
                'name' => 'Lidiya',
                'username' => 'lidiyanaa98',
                'password' => Hash::make('tatu2471'),
                'role' => UserRole::ADMIN,
                'email_verified_at' => now(),
            ]
        );
    }
}
