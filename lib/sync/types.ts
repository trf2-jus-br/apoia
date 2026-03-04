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
}

/** A parsed workflow from a .yaml file */
export interface ParsedWorkflow {
    uuid: string
    name: string
    slug: string
    target?: string
    scope?: string[]
    instance?: string[]
    matter?: string[]
    predecessors: WorkflowStep[]
    successors: WorkflowStep[]
    /** If this workflow also has a .md with matching uuid, it has its own prompt content */
    hasOwnPrompt?: boolean
}

export interface WorkflowStep {
    uuid: string
    optional?: boolean
    condition?: string
}

/** Result of reading a library source */
export interface LibraryContents {
    /** Identifier of the library (e.g., 'local:./prompts', 'github:cnj-ia/prompts-core') */
    library: string
    /** Version identifier (commit SHA for github, content hash for local) */
    version: string
    /** Parsed prompt definitions from .md files */
    prompts: ParsedPrompt[]
    /** Parsed workflow definitions from .yaml files */
    workflows: ParsedWorkflow[]
}

/** Interface that all library providers must implement */
export interface LibraryProvider {
    /** Read all prompts and workflows from this library source */
    read(): Promise<LibraryContents>
}

/** Result of a sync operation for logging/reporting */
export interface SyncResult {
    library: string
    added: number
    updated: number
    deactivated: number
    unchanged: number
    errors: string[]
}
