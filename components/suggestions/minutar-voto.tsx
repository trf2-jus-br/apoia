"use client"
import dynamic from 'next/dynamic'
import { ModalProps, SuggestionContext } from './context'
import { Suggestion } from './base'
import { Modal, Button, Form } from 'react-bootstrap'
import { useEffect, useState } from 'react'
import { faGavel } from '@fortawesome/free-solid-svg-icons'
import DraftSentenceModal from './minutar-sentenca'

export const id = 'draft-voto'
export const label = 'Voto'

export class MinutarVotoSuggestion extends Suggestion {
  constructor() { super(id, label, faGavel, DraftSentenceModal) }
  resolve(ctx: SuggestionContext) {
    return {
      type: 'modal' as const,
      key: id,
      initial: { processNumber: ctx.processNumber },
      onSubmit: (values: any, context: SuggestionContext) => {
        const numero = values?.processNumber?.trim()
        if (!numero) return
        if (numero !== context.processNumber) context.setProcessNumber(numero)
        const prompt = `Minute um voto para o processo ${numero}. Decisão: ${values?.decision}. ${values?.fundamentacao ? `Fundamentação: ${values?.fundamentacao}` : ''}`
        context.sendPrompt(prompt)
      }
    }
  }
}

export const suggestion = new MinutarVotoSuggestion()
