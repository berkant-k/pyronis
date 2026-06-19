import { User } from "lucide-react"

export interface PatientInfo {
  name:       string
  gender?:    string
  birthDate?: string
}

function fmtDate(iso: string): string {
  try {
    const [y, m, d] = iso.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  } catch { return iso }
}

function calcAge(iso: string): number | null {
  try {
    const [y, m, d] = iso.split("-").map(Number)
    const birth = new Date(y, m - 1, d)
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    const mo = now.getMonth() - birth.getMonth()
    if (mo < 0 || (mo === 0 && now.getDate() < birth.getDate())) age--
    return age
  } catch { return null }
}

export function PatientBanner({ name, gender, birthDate }: PatientInfo) {
  const age = birthDate ? calcAge(birthDate) : null
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
      <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="font-medium">{name}</span>
      {gender && <><span className="text-muted-foreground">·</span><span className="capitalize text-muted-foreground">{gender}</span></>}
      {birthDate && (
        <><span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{fmtDate(birthDate)}{age !== null ? ` (${age}y)` : ""}</span></>
      )}
    </div>
  )
}
