import { useState, useEffect, useRef } from 'react'
import { profile as profileApi, resume as resumeApi } from '../api'
import toast from 'react-hot-toast'
import {
  Upload,
  FileText,
  X,
  Plus,
  Trash2,
  Loader2,
  Save,
  CheckCircle2,
} from 'lucide-react'

export default function Profile() {
  const [data, setData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    skills: [],
    education: [],
    experience: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    profileApi
      .get()
      .then((res) => {
        const p = res.data.profile || res.data
        setData({
          name: p.name || '',
          email: p.email || '',
          phone: p.phone || '',
          location: p.location || '',
          summary: p.summary || '',
          skills: p.skills || [],
          education: p.education || [],
          experience: p.experience || [],
        })
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await profileApi.update(data)
      toast.success('Profile saved successfully')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (file) => {
    if (!file) return
    setUploading(true)
    setUploadedFile(file.name)
    const formData = new FormData()
    formData.append('resume', file)
    try {
      const res = await resumeApi.upload(formData)
      const parsed = res.data.profile || res.data
      setData({
        name: parsed.name || data.name,
        email: parsed.email || data.email,
        phone: parsed.phone || data.phone,
        location: parsed.location || data.location,
        summary: parsed.summary || data.summary,
        skills: parsed.skills || data.skills,
        education: parsed.education || data.education,
        experience: parsed.experience || data.experience,
      })
      toast.success('Resume uploaded and parsed successfully')
    } catch {
      toast.error('Failed to upload resume')
      setUploadedFile(null)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    handleFileUpload(file)
  }

  const addSkill = () => {
    const trimmed = skillInput.trim()
    if (trimmed && !data.skills.includes(trimmed)) {
      handleChange('skills', [...data.skills, trimmed])
      setSkillInput('')
    }
  }

  const removeSkill = (skill) => {
    handleChange(
      'skills',
      data.skills.filter((s) => s !== skill)
    )
  }

  const addEducation = () => {
    handleChange('education', [
      ...data.education,
      { degree: '', institution: '', year: '' },
    ])
  }

  const updateEducation = (index, field, value) => {
    const updated = [...data.education]
    updated[index] = { ...updated[index], [field]: value }
    handleChange('education', updated)
  }

  const removeEducation = (index) => {
    handleChange(
      'education',
      data.education.filter((_, i) => i !== index)
    )
  }

  const addExperience = () => {
    handleChange('experience', [
      ...data.experience,
      { title: '', company: '', duration: '', highlights: '' },
    ])
  }

  const updateExperience = (index, field, value) => {
    const updated = [...data.experience]
    updated[index] = { ...updated[index], [field]: value }
    handleChange('experience', updated)
  }

  const removeExperience = (index) => {
    handleChange(
      'experience',
      data.experience.filter((_, i) => i !== index)
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-gray-600">
          Upload your resume or edit your details manually.
        </p>
      </div>

      {/* Resume Upload */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Resume Upload
        </h2>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files[0])}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-sm font-medium text-gray-700">
                Parsing your resume...
              </p>
            </div>
          ) : uploadedFile ? (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
              <p className="text-sm font-medium text-gray-700">
                {uploadedFile}
              </p>
              <p className="text-xs text-gray-500">
                Click or drop to upload a new file
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Drop your resume here, or{' '}
                  <span className="text-indigo-600">browse</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, DOC, or DOCX (max 5MB)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">
          Personal Information
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={data.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone
            </label>
            <input
              type="text"
              value={data.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="+91 9876543210"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Location
            </label>
            <input
              type="text"
              value={data.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="Bangalore, India"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
        <textarea
          value={data.summary}
          onChange={(e) => handleChange('summary', e.target.value)}
          rows={4}
          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
          placeholder="A brief professional summary..."
        />
      </div>

      {/* Skills */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {data.skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg"
            >
              {skill}
              <button
                onClick={() => removeSkill(skill)}
                className="hover:text-indigo-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
            className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            placeholder="Add a skill..."
          />
          <button
            onClick={addSkill}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Education */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Education</h2>
          <button
            onClick={addEducation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        <div className="space-y-4">
          {data.education.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No education entries yet. Click "Add" to create one.
            </p>
          )}
          {data.education.map((edu, i) => (
            <div
              key={i}
              className="relative p-4 bg-gray-50 rounded-xl border border-gray-100"
            >
              <button
                onClick={() => removeEducation(i)}
                className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="grid sm:grid-cols-3 gap-4 pr-8">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Degree
                  </label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => updateEducation(i, 'degree', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="B.Tech CS"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Institution
                  </label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) =>
                      updateEducation(i, 'institution', e.target.value)
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="IIT Delhi"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Year
                  </label>
                  <input
                    type="text"
                    value={edu.year}
                    onChange={(e) => updateEducation(i, 'year', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="2024"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Experience */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Experience</h2>
          <button
            onClick={addExperience}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        <div className="space-y-4">
          {data.experience.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No experience entries yet. Click "Add" to create one.
            </p>
          )}
          {data.experience.map((exp, i) => (
            <div
              key={i}
              className="relative p-4 bg-gray-50 rounded-xl border border-gray-100"
            >
              <button
                onClick={() => removeExperience(i)}
                className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="grid sm:grid-cols-3 gap-4 pr-8 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={exp.title}
                    onChange={(e) =>
                      updateExperience(i, 'title', e.target.value)
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Software Engineer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) =>
                      updateExperience(i, 'company', e.target.value)
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Google"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={exp.duration}
                    onChange={(e) =>
                      updateExperience(i, 'duration', e.target.value)
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="2022 - Present"
                  />
                </div>
              </div>
              <div className="pr-8">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Highlights
                </label>
                <textarea
                  value={exp.highlights}
                  onChange={(e) =>
                    updateExperience(i, 'highlights', e.target.value)
                  }
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Key achievements, one per line..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
