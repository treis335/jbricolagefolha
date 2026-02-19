import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

// ── Lê as env vars do .env.local ─────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, "../.env.local")

let envVars = {}
try {
  const envContent = readFileSync(envPath, "utf-8")
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) return
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) return
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "")
    envVars[key] = value
  })
  console.log("✅ .env.local carregado com sucesso")
} catch (err) {
  console.error("❌ Não foi possível ler .env.local:", err.message)
  process.exit(1)
}

// ── Firebase config ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            envVars.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        envVars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     envVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             envVars.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Valida que temos as keys mínimas
const missing = Object.entries(firebaseConfig).filter(([, v]) => !v).map(([k]) => k)
if (missing.length > 0) {
  console.error("❌ Faltam estas variáveis no .env.local:", missing.join(", "))
  process.exit(1)
}

console.log("🔥 A ligar ao Firebase projeto:", firebaseConfig.projectId)

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// ── Script principal ──────────────────────────────────────────────────────────
async function stampTaxaHoraria() {
  console.log("\n🚀 A iniciar migração stamp-taxa-horaria...\n")

  const usersRef = collection(db, "users")
  const usersSnap = await getDocs(usersRef)

  let totalUsers = 0
  let totalEntriesProcessed = 0
  let totalEntriesUpdated = 0
  let totalEntriesSkipped = 0
  const errors = []

  for (const userDoc of usersSnap.docs) {
    totalUsers++
    const userId = userDoc.id
    const userData = userDoc.data()

    const workData = userData?.workData
    if (!workData) {
      console.log(`⚠️  User ${userId} — sem workData, a saltar`)
      continue
    }

    const taxaHoraria = workData?.settings?.taxaHoraria
    const entries = workData?.entries

    const userName = userData?.name || userData?.username || userId.slice(0, 8)

    if (typeof taxaHoraria !== "number" || taxaHoraria <= 0) {
      console.log(`⚠️  User ${userName} — taxa horária inválida (${taxaHoraria}), a saltar`)
      continue
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      console.log(`ℹ️  User ${userName} — sem entries, a saltar`)
      continue
    }

    console.log(`👤 User: ${userName} | Taxa: ${taxaHoraria}€/h | Entries: ${entries.length}`)

    // Stampa o taxaHoraria em cada entry que ainda não o tenha
    let userUpdated = 0
    let userSkipped = 0

    const updatedEntries = entries.map((entry) => {
      totalEntriesProcessed++

      if (typeof entry.taxaHoraria === "number" && entry.taxaHoraria > 0) {
        // Já tem taxa gravada — não tocar
        userSkipped++
        totalEntriesSkipped++
        return entry
      }

      // Grava a taxa atual nesta entry
      userUpdated++
      totalEntriesUpdated++
      return {
        ...entry,
        taxaHoraria,
      }
    })

    if (userUpdated === 0) {
      console.log(`   ✅ Todas as ${userSkipped} entries já tinham taxaHoraria — nada a fazer\n`)
      continue
    }

    // Actualiza o documento do user com as entries actualizadas
    try {
      await updateDoc(doc(db, "users", userId), {
        "workData.entries": updatedEntries,
      })
      console.log(`   💾 ${userUpdated} entries actualizadas | ${userSkipped} já tinham taxa\n`)
    } catch (err) {
      console.error(`   ❌ Erro ao actualizar user ${userName}:`, err.message)
      errors.push({ userId, userName, error: err.message })
    }
  }

  // ── Relatório final ──────────────────────────────────────────────────────
  console.log("═".repeat(50))
  console.log("📊 RELATÓRIO FINAL")
  console.log("═".repeat(50))
  console.log(`👥 Users processados:       ${totalUsers}`)
  console.log(`📅 Entries processadas:     ${totalEntriesProcessed}`)
  console.log(`✅ Entries actualizadas:    ${totalEntriesUpdated}`)
  console.log(`⏭️  Entries já com taxa:     ${totalEntriesSkipped}`)

  if (errors.length > 0) {
    console.log(`\n❌ Erros (${errors.length}):`)
    errors.forEach((e) => console.log(`   - ${e.userName} (${e.userId}): ${e.error}`))
  } else {
    console.log(`\n🎉 Migração concluída sem erros!`)
  }

  console.log("═".repeat(50))
  process.exit(0)
}

stampTaxaHoraria().catch((err) => {
  console.error("❌ Erro fatal:", err)
  process.exit(1)
})