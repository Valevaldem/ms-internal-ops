import { useState, useRef } from "react"
import { XCircle, Upload, AlertCircle } from "lucide-react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { bulkUpsertStoneLots } from "./actions"

type StoneLot = {
  code: string
  stoneName: string
  cut: string
  color: string
  pricePerCt: number
  pricingMode: string
  activeStatus: boolean
}

type ParsedRow = {
  row: number
  data: Partial<StoneLot>
  isValid: boolean
  errors: string[]
  isUpdate: boolean
}

type Props = {
  isOpen: boolean
  onClose: () => void
  existingLots: StoneLot[]
  onSuccess: () => void
}

const EXPECTED_COLUMNS = ["Código", "Piedra", "Corte", "Color", "Modo", "Precio", "Activo"]

export default function ImportModal({ isOpen, onClose, existingLots, onSuccess }: Props) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<"upload" | "preview">("upload")
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const existingCodes = new Set(existingLots.map(l => l.code))

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return
    processFile(uploadedFile)
  }

  const processFile = (fileToProcess: File) => {
    setIsProcessing(true)
    const fileExtension = fileToProcess.name.split('.').pop()?.toLowerCase()

    if (fileExtension === 'csv') {
      Papa.parse(fileToProcess, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          validateAndMapData(results.data as Record<string, unknown>[])
        },
        error: (error) => {
          console.error("CSV Parse Error:", error)
          setIsProcessing(false)
        }
      })
    } else if (fileExtension === 'xlsx') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet)
        validateAndMapData(jsonData as Record<string, unknown>[])
      }
      reader.readAsBinaryString(fileToProcess)
    } else {
      alert("Formato de archivo no soportado. Por favor use .csv o .xlsx")
      setIsProcessing(false)
    }
  }

  const validateAndMapData = (rawData: Record<string, unknown>[]) => {
    const processed: ParsedRow[] = []
    const seenCodes = new Set<string>()

    rawData.forEach((row, index) => {
      const rowNum = index + 2 // Assuming header is row 1
      const errors: string[] = []

      const code = row["Código"]?.toString().trim()
      const stoneName = row["Piedra"]?.toString().trim()
      const cut = row["Corte"]?.toString().trim()
      const color = row["Color"]?.toString().trim()
      const modeStr = row["Modo"]?.toString().trim().toUpperCase()
      const priceStr = row["Precio"]?.toString().trim()
      const activeStr = row["Activo"]?.toString().trim().toLowerCase()

      if (!code) errors.push("Falta Código")
      if (!stoneName) errors.push("Falta Piedra")
      if (!cut) errors.push("Falta Corte")
      if (!color) errors.push("Falta Color")

      let pricingMode = "CT"
      if (modeStr === "PZ" || modeStr === "CT") {
        pricingMode = modeStr
      } else {
        errors.push("Modo debe ser 'CT' o 'PZ'")
      }

      let pricePerCt = 0
      if (priceStr) {
        const parsed = parseFloat(priceStr.replace(/[^0-9.-]+/g,""))
        if (isNaN(parsed) || parsed < 0) {
          errors.push("Precio inválido")
        } else {
          pricePerCt = parsed
        }
      } else {
         errors.push("Falta Precio")
      }

      let activeStatus = true
      if (activeStr === "no" || activeStr === "false" || activeStr === "0") {
        activeStatus = false
      }

      if (code && seenCodes.has(code)) {
        errors.push("Código duplicado en archivo")
      } else if (code) {
        seenCodes.add(code)
      }

      const isUpdate = existingCodes.has(code)

      processed.push({
        row: rowNum,
        data: {
          code,
          stoneName,
          cut,
          color,
          pricePerCt,
          pricingMode,
          activeStatus
        },
        isValid: errors.length === 0,
        errors,
        isUpdate
      })
    })

    setParsedRows(processed)
    setStep("preview")
    setIsProcessing(false)
  }

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid).map(r => r.data as StoneLot)
    if (validRows.length === 0) return

    setIsProcessing(true)
    const result = await bulkUpsertStoneLots(validRows)
    setIsProcessing(false)

    if (result.success) {
      onSuccess()
      onClose()
    } else {
      alert("Error al importar: " + (result.error || "Desconocido"))
    }
  }

  const reset = () => {
    setFile(null)
    setParsedRows([])
    setStep("upload")
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validCount = parsedRows.filter(r => r.isValid).length
  const errorCount = parsedRows.filter(r => !r.isValid).length
  const createCount = parsedRows.filter(r => r.isValid && !r.isUpdate).length
  const updateCount = parsedRows.filter(r => r.isValid && r.isUpdate).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-[#D8D3CC] shrink-0">
          <h3 className="text-xl font-serif text-[#333333]">Importar Lotes de Piedras</h3>
          <button onClick={onClose} className="text-[#8E8D8A] hover:text-[#333333]">
            <XCircle size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-[#D8D3CC] rounded-lg bg-[#F9F8F6]">
              <Upload size={48} className="text-[#C5B358] mb-4" />
              <p className="text-[#555555] font-medium mb-2">Sube un archivo .csv o .xlsx</p>
              <p className="text-[#8E8D8A] text-sm mb-6 max-w-md text-center">
                El archivo debe contener exactamente las siguientes columnas: <br/>
                <span className="font-mono text-xs text-[#333333] bg-white px-2 py-1 rounded mt-2 inline-block shadow-sm">
                  {EXPECTED_COLUMNS.join(" | ")}
                </span>
              </p>

              <input
                type="file"
                ref={fileInputRef}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="px-6 py-2.5 bg-[#333333] text-white rounded-md hover:bg-[#4A4A4A] transition-colors cursor-pointer text-sm font-medium"
              >
                {isProcessing ? "Procesando..." : "Seleccionar Archivo"}
              </label>
            </div>
          )}

          {step === "preview" && (
             <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-[#E8F3EB] p-4 rounded-lg border border-[#CDE5D5]">
                    <div className="text-sm text-[#2E6B41] font-medium mb-1">Filas Válidas</div>
                    <div className="text-2xl font-semibold text-[#1A4026]">{validCount}</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <div className="text-sm text-red-600 font-medium mb-1">Con Errores</div>
                    <div className="text-2xl font-semibold text-red-700">{errorCount}</div>
                  </div>
                  <div className="bg-[#F5F2EE] p-4 rounded-lg border border-[#D8D3CC]">
                    <div className="text-sm text-[#555555] font-medium mb-1">Nuevos Lotes</div>
                    <div className="text-2xl font-semibold text-[#333333]">{createCount}</div>
                  </div>
                  <div className="bg-[#F5F2EE] p-4 rounded-lg border border-[#D8D3CC]">
                    <div className="text-sm text-[#555555] font-medium mb-1">A Actualizar</div>
                    <div className="text-2xl font-semibold text-[#333333]">{updateCount}</div>
                  </div>
                </div>

                {errorCount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <h4 className="flex items-center gap-2 text-red-700 font-medium mb-2 text-sm">
                      <AlertCircle size={16} />
                      Se encontraron errores en {errorCount} fila(s). Estas filas serán ignoradas.
                    </h4>
                    <div className="max-h-40 overflow-y-auto bg-white rounded border border-red-100 p-2 text-sm">
                      <ul className="space-y-1 text-red-600">
                        {parsedRows.filter(r => !r.isValid).map((r, i) => (
                          <li key={i}>Fila {r.row}: {r.errors.join(", ")}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="border border-[#D8D3CC] rounded-md overflow-hidden">
                   <div className="bg-[#F5F2EE] px-4 py-2 border-b border-[#D8D3CC] text-sm font-medium text-[#555555]">
                     Vista Previa de Importación ({validCount} filas válidas)
                   </div>
                   <div className="max-h-60 overflow-y-auto">
                     <table className="w-full text-left text-sm whitespace-nowrap">
                       <thead className="bg-white sticky top-0 z-10 shadow-sm border-b border-[#D8D3CC]">
                         <tr>
                           <th className="px-4 py-2 font-medium text-[#8E8D8A]">Acción</th>
                           <th className="px-4 py-2 font-medium text-[#8E8D8A]">Código</th>
                           <th className="px-4 py-2 font-medium text-[#8E8D8A]">Piedra</th>
                           <th className="px-4 py-2 font-medium text-[#8E8D8A]">Modo</th>
                           <th className="px-4 py-2 font-medium text-[#8E8D8A]">Precio</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-[#D8D3CC] bg-white">
                         {parsedRows.filter(r => r.isValid).slice(0, 100).map((r, i) => (
                           <tr key={i} className="hover:bg-[#F9F8F6]">
                             <td className="px-4 py-2">
                               {r.isUpdate ?
                                 <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Actualizar</span> :
                                 <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">Crear</span>
                               }
                             </td>
                             <td className="px-4 py-2 font-medium">{r.data.code}</td>
                             <td className="px-4 py-2">{r.data.stoneName}</td>
                             <td className="px-4 py-2">{r.data.pricingMode}</td>
                             <td className="px-4 py-2">${r.data.pricePerCt?.toFixed(2)}</td>
                           </tr>
                         ))}
                         {validCount > 100 && (
                           <tr>
                             <td colSpan={5} className="px-4 py-3 text-center text-[#8E8D8A] italic">
                               Y {validCount - 100} filas más...
                             </td>
                           </tr>
                         )}
                       </tbody>
                     </table>
                   </div>
                </div>
             </div>
          )}
        </div>

        <div className="p-6 border-t border-[#D8D3CC] bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={step === "preview" ? reset : onClose}
            className="px-4 py-2 text-sm text-[#555555] bg-white border border-[#D8D3CC] hover:bg-[#F5F2EE] rounded-md transition-colors"
          >
            {step === "preview" ? "Atrás" : "Cancelar"}
          </button>

          <button
            onClick={handleImport}
            disabled={step === "upload" || validCount === 0 || isProcessing}
            className="px-4 py-2 text-sm text-white bg-[#333333] hover:bg-[#4A4A4A] rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? "Importando..." : "Confirmar Importación"}
          </button>
        </div>
      </div>
    </div>
  )
}
