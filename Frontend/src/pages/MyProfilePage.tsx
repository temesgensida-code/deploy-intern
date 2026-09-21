import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Briefcase, MapPin, Mail, Phone, GraduationCap, Globe, Edit3, Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import EmployeeSidebar from '@/components/employee/EmployeeSidebar'
import EmployerHeader from '@/components/employer/EmployerHeader'
import { employeeFeedService } from '@/services/employeeFeedService'
import { getStorageUrl } from '@/lib/utils'

function uid() {
  return Math.random().toString(36).slice(2)
}

export default function MyProfilePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { profile, setProfile } = useProfileStore()

  useEffect(() => {
    employeeFeedService
      .getProfile()
      .then((res) => {
        if (res?.profile) {
          const p = res.profile
          setProfile({
            headline: p.headline ?? profile.headline,
            phone: p.phone ?? profile.phone,
            location: p.location ?? profile.location,
            bio: p.bio ?? profile.bio,
            skills: Array.isArray(p.skills) ? p.skills : profile.skills,
            experience:
              Array.isArray(p.experience) && p.experience.length > 0
                ? p.experience.map((e: any) => ({
                    id: e.id || uid(),
                    title: e.title || '',
                    company: e.company || '',
                    period: e.start_date
                      ? `${e.start_date} - ${e.end_date || 'Present'}`
                      : e.period || '',
                  }))
                : profile.experience,
            education:
              Array.isArray(p.education) && p.education.length > 0
                ? p.education.map((e: any) => ({
                    id: e.id || uid(),
                    degree: e.degree || '',
                    institution: e.institution || '',
                    year: e.year || '',
                  }))
                : profile.education,
            languages:
              Array.isArray(p.languages) && p.languages.length > 0
                ? p.languages.map((l: any) => ({
                    id: l.id || uid(),
                    name: typeof l === 'string' ? l : l?.name || l?.language || '',
                    level: l?.level || l?.fluency || 'Fluent',
                    isCustom: l?.isCustom,
                  }))
                : profile.languages,
          })
        }
      })
      .catch(() => {})
  }, [])

  const filledFields = [
    profile.headline,
    profile.phone,
    profile.location,
    profile.bio,
    profile.skills.length > 0,
    profile.experience.length > 0,
    profile.education.length > 0,
    profile.languages.length > 0,
  ].filter(Boolean).length
  const completion = Math.round((filledFields / 8) * 100)

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <EmployeeSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pt-14 md:pt-0">
        <EmployerHeader title={t('profile.title')} />

        <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Notion Page Header Card */}
          <div className="bg-card border border-border/70 rounded-xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
              <div className="flex items-start gap-4 min-w-0">
                {user?.profile_photo_url ? (
                  <img
                    src={getStorageUrl(user.profile_photo_url)}
                    alt={user.name}
                    className="h-14 w-14 rounded-xl object-cover border border-border/70 flex-shrink-0 shadow-xs"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-xl font-bold flex-shrink-0 shadow-xs">
                    {user?.name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {user?.name ?? 'Candidate Profile'}
                  </h2>
                  {profile.headline ? (
                    <p className="text-sm font-medium text-foreground/80">{profile.headline}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">{t('profile.addHeadline')}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                    {profile.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{profile.location}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{user?.email}</span>
                    </span>
                    {profile.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{profile.phone}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/edit-profile')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-opacity self-start sm:self-auto flex-shrink-0"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>{t('profile.editProfile')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content (Left 2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              {/* About / Bio */}
              <div className="bg-card border border-border/70 rounded-xl p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('profile.about')}
                  </span>
                </div>
                {profile.bio ? (
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {t('profile.noBio')}{' '}
                    <button
                      onClick={() => navigate('/edit-profile')}
                      className="text-foreground font-medium underline underline-offset-2 hover:opacity-80"
                    >
                      {t('profile.addOne')}
                    </button>
                  </p>
                )}
              </div>

              {/* Work Experience */}
              <div className="bg-card border border-border/70 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('profile.workExperience')}
                  </h3>
                  <button
                    onClick={() => navigate('/edit-profile')}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    + Add
                  </button>
                </div>

                {profile.experience.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">
                    {t('profile.noExperience')}{' '}
                    <button
                      onClick={() => navigate('/edit-profile')}
                      className="text-foreground font-medium underline underline-offset-2 hover:opacity-80"
                    >
                      {t('profile.addExperience')}
                    </button>
                  </p>
                ) : (
                  <div className="space-y-4">
                    {profile.experience.map((job, i) => (
                      <div
                        key={job.id}
                        className={`flex items-start gap-3.5 ${
                          i !== profile.experience.length - 1 ? 'pb-4 border-b border-border/40' : ''
                        }`}
                      >
                        <div className="h-8 w-8 rounded-lg bg-muted text-foreground/80 flex items-center justify-center shrink-0 mt-0.5">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="font-semibold text-sm text-foreground">{job.title}</p>
                          <p className="text-xs text-muted-foreground font-medium">{job.company}</p>
                          {job.period && (
                            <p className="text-[11px] text-muted-foreground/80 font-mono pt-0.5">
                              {job.period}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Education */}
              <div className="bg-card border border-border/70 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('profile.education')}
                  </h3>
                  <button
                    onClick={() => navigate('/edit-profile')}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    + Add
                  </button>
                </div>

                {profile.education.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">
                    {t('profile.noEducation')}{' '}
                    <button
                      onClick={() => navigate('/edit-profile')}
                      className="text-foreground font-medium underline underline-offset-2 hover:opacity-80"
                    >
                      {t('profile.addEducation')}
                    </button>
                  </p>
                ) : (
                  <div className="space-y-4">
                    {profile.education.map((edu, i) => (
                      <div
                        key={edu.id}
                        className={`flex items-start gap-3.5 ${
                          i !== profile.education.length - 1 ? 'pb-4 border-b border-border/40' : ''
                        }`}
                      >
                        <div className="h-8 w-8 rounded-lg bg-muted text-foreground/80 flex items-center justify-center shrink-0 mt-0.5">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="font-semibold text-sm text-foreground">{edu.degree}</p>
                          <p className="text-xs text-muted-foreground font-medium">{edu.institution}</p>
                          {edu.year && (
                            <p className="text-[11px] text-muted-foreground/80 font-mono pt-0.5">
                              {edu.year}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Rail (Right col) */}
            <div className="space-y-6">
              {/* Profile Completion */}
              <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('profile.profileCompletion')}
                  </h3>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {completion}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 dark:bg-white transition-all duration-300"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                {completion < 100 && (
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    <button
                      onClick={() => navigate('/edit-profile')}
                      className="text-foreground font-medium underline underline-offset-2 hover:opacity-80"
                    >
                      {t('profile.completeProfile')}
                    </button>{' '}
                    {t('profile.toStandOut')}
                  </p>
                )}
              </div>

              {/* Skills */}
              <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('profile.skills')}
                  </h3>
                  {profile.skills.length > 0 && (
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {profile.skills.length}
                    </span>
                  )}
                </div>

                {profile.skills.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">
                    {t('profile.noSkills')}{' '}
                    <button
                      onClick={() => navigate('/edit-profile')}
                      className="text-foreground font-medium underline underline-offset-2 hover:opacity-80"
                    >
                      {t('profile.addSkills')}
                    </button>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 px-2.5 py-0.5 rounded-md"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Languages */}
              <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('profile.languages')}
                  </h3>
                  <button
                    onClick={() => navigate('/edit-profile')}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add</span>
                  </button>
                </div>

                {profile.languages.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">
                    {t('profile.noLanguages')}{' '}
                    <button
                      onClick={() => navigate('/edit-profile')}
                      className="text-foreground font-medium underline underline-offset-2 hover:opacity-80"
                    >
                      {t('profile.addLanguages')}
                    </button>
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {profile.languages.map((lang) => (
                      <div
                        key={lang.id || lang.name}
                        className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-muted/40 border border-border/50"
                      >
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{lang.name}</span>
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground bg-background/80 px-2 py-0.5 rounded-md border border-border/50">
                          {lang.level}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
