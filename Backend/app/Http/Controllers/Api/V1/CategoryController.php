<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Category\StoreCategoryRequest;
use App\Http\Requests\V1\Category\UpdateCategoryRequest;
use App\Http\Traits\ApiResponse;
use App\Models\Category;
use Database\Seeders\CategorySeeder;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $categories = Category::where('is_active', true)
            ->orderBy('display_order')
            ->get();

        if ($categories->isEmpty()) {
            (new CategorySeeder())->run();
            $categories = Category::where('is_active', true)
                ->orderBy('display_order')
                ->get();
        }

        return $this->success($categories, 'Categories retrieved successfully');
    }

    public function adminIndex(): JsonResponse
    {
        $categories = Category::orderBy('display_order')->get();

        if ($categories->isEmpty()) {
            (new CategorySeeder())->run();
            $categories = Category::orderBy('display_order')->get();
        }

        return $this->success($categories, 'All categories retrieved successfully');
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = Category::create($request->validated());

        return $this->created($category, 'Category created successfully');
    }

    public function show(Category $category): JsonResponse
    {
        return $this->success($category, 'Category retrieved successfully');
    }

    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        $category->update($request->validated());

        return $this->success($category, 'Category updated successfully');
    }

    public function destroy(Category $category): JsonResponse
    {
        $category->update(['is_active' => false]);

        return $this->deleted('Category deactivated successfully');
    }
}
