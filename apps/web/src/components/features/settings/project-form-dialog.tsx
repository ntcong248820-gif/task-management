"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Project } from "@repo/types"

const COLOR_OPTIONS = [
  { label: "Blue", value: "#3B82F6" },
  { label: "Green", value: "#22C55E" },
  { label: "Purple", value: "#A855F7" },
  { label: "Orange", value: "#F97316" },
  { label: "Red", value: "#EF4444" },
  { label: "Pink", value: "#EC4899" },
  { label: "Teal", value: "#14B8A6" },
  { label: "Yellow", value: "#EAB308" },
]

interface FormState {
  name: string
  domain: string
  description: string
  color: string
  isActive: boolean
}

const DEFAULT_FORM: FormState = {
  name: "",
  domain: "",
  description: "",
  color: "",
  isActive: true,
}

export interface ProjectPayload {
  name: string
  domain: string | null
  description: string | null
  color: string | null
  isActive: boolean
}

interface ProjectFormDialogProps {
  open: boolean
  project?: Project | null
  onClose: () => void
  onCreate?: (payload: ProjectPayload) => Promise<unknown>
  onUpdate?: (id: string, payload: Partial<ProjectPayload>) => Promise<unknown>
}

export function ProjectFormDialog({ open, project, onClose, onCreate, onUpdate }: ProjectFormDialogProps) {
  const isEdit = Boolean(project)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (project) {
      setForm({
        name: project.name,
        domain: project.domain ?? "",
        description: project.description ?? "",
        color: project.color ?? "",
        isActive: project.isActive,
      })
    } else {
      setForm(DEFAULT_FORM)
    }
    setErrors({})
  }, [open, project])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) {
      next.name = "Project name is required"
    } else if (form.name.trim().length > 100) {
      next.name = "Name must be 100 characters or fewer"
    }
    // Domain is optional and accepts any non-empty string (matches server validation)
    if (form.domain && !form.domain.trim()) {
      next.domain = "Domain cannot be empty if provided"
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        domain: form.domain.trim() || null,
        description: form.description.trim() || null,
        color: form.color || null,
        isActive: form.isActive,
      }
      if (isEdit && project && onUpdate) {
        await onUpdate(project.id, payload)
        toast.success("Project updated")
      } else if (onCreate) {
        await onCreate(payload)
        toast.success("Project created", {
          description: "Next: connect a data source in Integrations.",
        })
      }
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input
              className="mt-1 h-8 text-xs"
              placeholder="e.g. Main Website"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              disabled={submitting}
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
          </div>

          <div>
            <Label className="text-xs">Domain</Label>
            <Input
              className="mt-1 h-8 text-xs"
              placeholder="e.g. example.com"
              value={form.domain}
              onChange={(e) => setField("domain", e.target.value)}
              disabled={submitting}
            />
            {errors.domain && <p className="mt-1 text-xs text-destructive">{errors.domain}</p>}
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              className="mt-1 min-h-[60px] text-xs"
              placeholder="Optional project notes"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Color</Label>
              <Select
                value={form.color}
                onValueChange={(v) => setField("color", v)}
                disabled={submitting}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="Choose color" />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full border"
                          style={{ backgroundColor: c.value }}
                        />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={form.isActive ? "active" : "inactive"}
                onValueChange={(v) => setField("isActive", v === "active")}
                disabled={submitting}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save changes" : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
