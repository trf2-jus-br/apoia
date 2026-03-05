/**
 * Types for the prompt sync engine.
 * 
 * The sync engine synchronizes prompts from external sources (local filesystem,
 * GitHub repositories) into the ia_prompt database table.
 */

/** A parsed prompt from a .md file, ready to be synced to the database */
export interface ParsedPrompt {
    /** UUID from the # METADATA section. Required for github: provider, auto-generated for local: */
    uuid: string
    /** Slug derived from the filename (e.g., 'analise-completa' from 'analise-completa.md') */
    slug: string
    /** Human-readable name from metadata, or derived from slug */
    name: string
    /** The system prompt content (from # SYSTEM PROMPT section) */
    systemPrompt: string | null
    /** The main prompt content (from # PROMPT section) */
    prompt: string | null
    /** JSON Schema for structured output (from # JSON SCHEMA section) */
    jsonSchema: string | null
    /** Output format instructions (from # FORMAT section) */
    format: string | null
    /** Template content */
    template: string | null
    /** Full metadata object from YAML parsing */
    metadata: Record<string, any>
    /** Relative path of the source file within the library */
    relativePath: string
    /** Workflow predecessors as declared in METADATA (path-based, unresolved) */
    predecessors?: WorkflowRef[]
    /** Workflow successors as declared in METADATA (path-based, unresolved) */
    successors?: WorkflowRef[]
}

/** A workflow step reference as declared in METADATA (before UUID resolution) */
export interface WorkflowRef {
    /** Path reference to another prompt (slug or relative path, e.g., 'chat') */
    path?: string
    /** Direct UUID reference (for github: provider or cross-library refs) */
    uuid?: string
    /** Whether this step is optional */
    optional?: boolean
    /** Condition expression for conditional steps */
    condition?: string
}

/** A resolved workflow step (after path -> UUID resolution), ready for database storage */
export interface WorkflowStepResolved {
    uuid: string
    optional?: boolean
    condition?: string
}

/** Resolved workflow for a prompt, stored inside ia_prompt.content.workflow */
export interface WorkflowResolved {
    predecessors?: WorkflowStepResolved[]
    successors?: WorkflowStepResolved[]
}

/** Result of reading an origin source */
export interface OriginContents {
    /** Identifier of the origin (e.g., 'local:./prompts', 'github:cnj-ia/prompts-core') */
    origin: string
    /** Version identifier (commit SHA for github, content hash for local) */
    version: string
    /** Parsed prompt definitions from .md files (may include workflow refs) */
    prompts: ParsedPrompt[]
}

/** Interface that all origin providers must implement */
export interface OriginProvider {
    /** Read all prompts and workflows from this origin source */
    read(): Promise<OriginContents>
}

/** Result of a sync operation for logging/reporting */
export interface SyncResult {
    origin: string
    added: number
    updated: number
    deactivated: number
    unchanged: number
    errors: string[]
}
