<?php

declare(strict_types=1);

namespace App\Notifications\V1\Employee;

use App\Models\JobPost;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class JobMatchNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<string, mixed>  $reasons
     */
    public function __construct(
        public JobPost $jobPost,
        public int $matchScore,
        public array $reasons = []
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (method_exists($notifiable, 'wantsEmailNotifications') && $notifiable->wantsEmailNotifications()) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $companyName = $this->jobPost->employer->company_name ?? 'An employer';
        $matchedSkills = (array) ($this->reasons['matched_skills'] ?? []);
        $actionUrl = rtrim((string) config('app.frontend_url'), '/') . "/jobs/{$this->jobPost->slug}";

        $mail = (new MailMessage)
            ->subject("🎯 New {$this->matchScore}% Job Match: {$this->jobPost->title}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Our job matching system found a position that strongly aligns with your qualifications and skills:")
            ->line("**Role:** {$this->jobPost->title}")
            ->line("**Company:** {$companyName}")
            ->line("**Match Score:** {$this->matchScore}% match");

        if (! empty($matchedSkills)) {
            $mail->line("**Matched Skills:** " . implode(', ', array_slice($matchedSkills, 0, 5)));
        }

        if ($this->jobPost->is_remote) {
            $mail->line("**Location:** Remote 🌐");
        } elseif ($this->jobPost->location) {
            $mail->line("**Location:** {$this->jobPost->location}");
        }

        return $mail
            ->action('View Job & Apply Now', $actionUrl)
            ->line('Be among the first candidates to apply to maximize your chances of being interviewed!')
            ->line('Thank you for searching for opportunities on ' . config('app.name') . '!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $companyName = $this->jobPost->employer->company_name ?? 'An employer';
        $matchedSkills = (array) ($this->reasons['matched_skills'] ?? []);
        $skillsPreview = ! empty($matchedSkills)
            ? ' Matches your skills: ' . implode(', ', array_slice($matchedSkills, 0, 3)) . '.'
            : '';

        return [
            'type' => 'job_match',
            'title' => "New Job Match: {$this->matchScore}% Match",
            'message' => "We found a position matching your profile: '{$this->jobPost->title}' at {$companyName}.{$skillsPreview}",
            'job_post_id' => $this->jobPost->id,
            'job_title' => $this->jobPost->title,
            'job_slug' => $this->jobPost->slug,
            'company_name' => $companyName,
            'match_score' => $this->matchScore,
            'matched_skills' => $matchedSkills,
            'action_url' => "/jobs/{$this->jobPost->slug}",
            'created_at' => now()->toIso8601String(),
        ];
    }
}
