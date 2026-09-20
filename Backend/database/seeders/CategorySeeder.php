<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Software & IT',
                'slug' => 'software-it',
                'description' => 'Software development, engineering, devops, and cloud computing roles.',
                'icon' => '💻',
                'display_order' => 1,
                'is_active' => true,
            ],
            [
                'name' => 'Data Science & Analytics',
                'slug' => 'data-science-analytics',
                'description' => 'Data engineering, machine learning, AI research, and business intelligence.',
                'icon' => '📊',
                'display_order' => 2,
                'is_active' => true,
            ],
            [
                'name' => 'Product & Design',
                'slug' => 'product-design',
                'description' => 'UI/UX design, product management, user research, and graphic design.',
                'icon' => '🎨',
                'display_order' => 3,
                'is_active' => true,
            ],
            [
                'name' => 'Marketing & Sales',
                'slug' => 'marketing-sales',
                'description' => 'Digital marketing, SEO, content writing, account management, and sales.',
                'icon' => '📈',
                'display_order' => 4,
                'is_active' => true,
            ],
            [
                'name' => 'Customer Support',
                'slug' => 'customer-support',
                'description' => 'Customer success, help desk support, and client experience management.',
                'icon' => '🎧',
                'display_order' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'Finance & Accounting',
                'slug' => 'finance-accounting',
                'description' => 'Financial planning, accounting, auditing, and corporate finance.',
                'icon' => '🏦',
                'display_order' => 6,
                'is_active' => true,
            ],
            [
                'name' => 'Human Resources & Operations',
                'slug' => 'human-resources-operations',
                'description' => 'Talent acquisition, HR management, workplace operations, and administration.',
                'icon' => '👥',
                'display_order' => 7,
                'is_active' => true,
            ],
            [
                'name' => 'Healthcare & Medical',
                'slug' => 'healthcare-medical',
                'description' => 'Healthcare management, medical research, and clinical roles.',
                'icon' => '🏥',
                'display_order' => 8,
                'is_active' => true,
            ],
            [
                'name' => 'Education & Training',
                'slug' => 'education-training',
                'description' => 'Teaching, corporate training, academic research, and curriculum development.',
                'icon' => '📚',
                'display_order' => 9,
                'is_active' => true,
            ],
        ];

        foreach ($categories as $cat) {
            Category::updateOrCreate(['slug' => $cat['slug']], $cat);
        }
    }
}
