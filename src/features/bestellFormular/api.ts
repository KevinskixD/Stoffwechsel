import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import {
  BESTELL_FORMULAR_SETTINGS_DOC_ID,
  emptyTableMapping,
  type BestellFormularSettings,
  type TableMapping,
} from '../../types/bestellFormularSettings'

const settingsRef = () => doc(db, 'bestellFormularSettings', BESTELL_FORMULAR_SETTINGS_DOC_ID)

export function defaultBestellFormularSettings(): BestellFormularSettings {
  return {
    id: BESTELL_FORMULAR_SETTINGS_DOC_ID,
    templateBase64: '',
    templateFileName: '',
    sheetName: '',
    datumCell: '',
    ortsstelleCell: '',
    ortsstelle: 'Lieboch',
    upperTable: emptyTableMapping(),
    lowerTable: emptyTableMapping(),
    triggerStatusId: '',
    targetStatusId: '',
    updatedAt: new Date(),
  }
}

function fromTableMapping(data: Record<string, unknown> | undefined): TableMapping {
  const empty = emptyTableMapping()
  if (!data) return empty
  return {
    headerRow: (data.headerRow as number | undefined) ?? empty.headerRow,
    startRow: (data.startRow as number | undefined) ?? empty.startRow,
    endRow: (data.endRow as number | undefined) ?? empty.endRow,
    artikelNrColumn: (data.artikelNrColumn as string | undefined) ?? empty.artikelNrColumn,
    bezeichnungColumn: (data.bezeichnungColumn as string | undefined) ?? empty.bezeichnungColumn,
    mengeColumn: (data.mengeColumn as string | undefined) ?? empty.mengeColumn,
    nameColumn: (data.nameColumn as string | undefined) ?? empty.nameColumn,
    bosColumn: (data.bosColumn as string | undefined) ?? empty.bosColumn,
  }
}

function fromSnapshot(data: Record<string, unknown> | undefined): BestellFormularSettings {
  const defaults = defaultBestellFormularSettings()
  if (!data) return defaults
  return {
    id: BESTELL_FORMULAR_SETTINGS_DOC_ID,
    templateBase64: (data.templateBase64 as string | undefined) ?? defaults.templateBase64,
    templateFileName: (data.templateFileName as string | undefined) ?? defaults.templateFileName,
    sheetName: (data.sheetName as string | undefined) ?? defaults.sheetName,
    datumCell: (data.datumCell as string | undefined) ?? defaults.datumCell,
    ortsstelleCell: (data.ortsstelleCell as string | undefined) ?? defaults.ortsstelleCell,
    ortsstelle: (data.ortsstelle as string | undefined) ?? defaults.ortsstelle,
    upperTable: fromTableMapping(data.upperTable as Record<string, unknown> | undefined),
    lowerTable: fromTableMapping(data.lowerTable as Record<string, unknown> | undefined),
    triggerStatusId: (data.triggerStatusId as string | undefined) ?? defaults.triggerStatusId,
    targetStatusId: (data.targetStatusId as string | undefined) ?? defaults.targetStatusId,
    updatedAt: new Date(),
  }
}

export async function getBestellFormularSettings(): Promise<BestellFormularSettings> {
  const snap = await getDoc(settingsRef())
  return fromSnapshot(snap.exists() ? snap.data() : undefined)
}

export function subscribeBestellFormularSettings(onChange: (settings: BestellFormularSettings) => void): () => void {
  return onSnapshot(settingsRef(), (snap) => onChange(fromSnapshot(snap.exists() ? snap.data() : undefined)))
}

export async function saveBestellFormularSettings(
  patch: Pick<
    BestellFormularSettings,
    | 'templateBase64'
    | 'templateFileName'
    | 'sheetName'
    | 'datumCell'
    | 'ortsstelleCell'
    | 'ortsstelle'
    | 'upperTable'
    | 'lowerTable'
    | 'triggerStatusId'
    | 'targetStatusId'
  >,
): Promise<void> {
  await setDoc(settingsRef(), { ...patch, updatedAt: serverTimestamp() }, { merge: true })
}
