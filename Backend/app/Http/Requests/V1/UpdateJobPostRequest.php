<?php

declare(strict_types=1);

namespace App\Http\Requests\V1;

use App\Enums\ExperienceLevel;
use App\Enums\JobType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateJobPostRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('requirements') && is_string($this->requirements)) {
            $this->merge([
                'requirements' => array_values(array_filter(array_map('trim', explode("\n", $this->requirements)))),
            ]);
        }

        if ($this->has('responsibilities') && is_string($this->responsibilities)) {
            $this->merge([
                'responsibilities' => array_values(array_filter(array_map('trim', explode("\n", $this->responsibilities)))),
            ]);
        }

        if ($this->has('deadline') && ! $this->has('expires_at')) {
            $this->merge([
                'expires_at' => $this->deadline,
            ]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'category_id' => ['sometimes', 'integer', 'exists:categories,id'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'string', 'min:10'],
            'requirements' => ['nullable', 'array'],
            'requirements.*' => ['string', 'max:500'],
            'responsibilities' => ['nullable', 'array'],
            'responsibilities.*' => ['string', 'max:500'],
            'job_type' => ['sometimes', 'string', Rule::in(JobType::values())],
            'experience_level' => ['sometimes', 'string', Rule::in(ExperienceLevel::values())],
            'location' => ['nullable', 'string', 'max:255'],
            'salary_min' => ['nullable', 'integer', 'min:0'],
            'salary_max' => ['nullable', 'integer', 'min:0'],
            'salary_currency' => ['nullable', 'string', 'max:10'],
            'is_remote' => ['nullable', 'boolean'],
            'expires_at' => ['nullable', 'date'],
            'deadline' => ['nullable', 'date'],
        ];
    }
}
