'use client'

import React from 'react'
import { FormHelper } from '@/lib/ui/form-support'
import { flatternPromptVariables, parsePromptVariablesFromMarkdown, PromptVariableType } from '@/lib/ai/auto-json'
import { Button } from 'react-bootstrap'
import { preprocess } from '@/lib/ui/preprocess'
import { PromptDefinitionType } from '@/lib/ai/prompt-types'

export type PromptFormProps = {
    promptMarkdown: string
    promptFormat: string
    Frm: FormHelper
    variableName: string
}

const PromptField = (variable: PromptVariableType, Frm: FormHelper, variableName: string) => {
    switch (variable.type) {
        case 'boolean':
            return (
                <Frm.Checkbox
                    key={variable.name}
                    label={variable.label || variable.name}
                    name={`${variableName}.${variable.name}`}
                    width={6}
                />
            )
        case 'number':
        case 'date':
            return (
                <Frm.Input
                    key={variable.name}
                    label={variable.label || variable.name}
                    name={`${variableName}.${variable.name}`}
                    width={6}
                />
            )
        case 'string-long':
            return (
                <Frm.TextArea
                    key={variable.name}
                    label={variable.label || variable.name}
                    name={`${variableName}.${variable.name}`}
                    width={12}
                />
            )
        case 'string':
        default:
            return (
                <Frm.Input
                    key={variable.name}
                    label={variable.label || variable.name}
                    name={`${variableName}.${variable.name}`}
                    width={6}
                />
            )
    }
}

const Variable: React.FC<{ variable: PromptVariableType; index: number, Frm: FormHelper, variableName: string }> = ({ variable, index, Frm, variableName }) => {
    return <>
        {variable.separatorName && <div className="col-12"><h4 className={`${index ? 'mt-3' : 'mt-0'} mb-1`}>{variable.separatorName.replace(/_/g, ' ')}</h4></div>}
        {PromptField(variable, Frm, variableName)}
    </>
}

const Array: React.FC<{ variable: PromptVariableType; index: number, Frm: FormHelper, variableName: string }> = ({ variable, index, Frm, variableName }) => {
    const a = Frm.get(`${variableName}.${variable.name}`)
    console.log('length:', `${variableName}.${variable.name}`, a?.length)
    // console.log(`Array: variableName=${variableName}, a=${JSON.stringify(a)}`)
    return <>
        {variable.label && <div className="col-12"><h4 className={`${index ? 'mt-3' : 'mt-0'} mb-1`}>{variable.label.replace(/_/g, ' ')}</h4></div>}
        {a?.length &&
            a.map((_: any, index: number) => (
                <div key={index} className="col col-12">
                    <div className="row">
                        <div className="col col-auto">{index + 1}.</div>
                        <div className="col">
                            <div className="row">
                                {variable.properties.map((property, index2) => (
                                    <Variable key={index2} variable={property} index={index2} Frm={Frm} variableName={`${variableName}.${variable.name}[${index}]`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
    </>
}

export const InformationExtractionForm: React.FC<PromptFormProps> = ({ promptMarkdown, promptFormat, Frm, variableName }) => {
    const variables = flatternPromptVariables(parsePromptVariablesFromMarkdown(promptMarkdown))
    // if (!variables || variables.length === 0) return null
    // console.log(`InformationExtractionForm: variables: ${JSON.stringify(variables, null, 2)}`)

    if (!Frm.get('information_extraction_editing')) {
        let promptFormatPreprocessed = promptFormat
        promptFormatPreprocessed = promptFormatPreprocessed.replace(/{{/g, '<ins class="diffins-highlight">{{')
        promptFormatPreprocessed = promptFormatPreprocessed.replace(/}}/g, '}}</ins>')
        promptFormatPreprocessed = promptFormatPreprocessed.replace(/{=/g, '{{')
        promptFormatPreprocessed = promptFormatPreprocessed.replace(/=}/g, '}}')
        // console.log(`Prompt format preprocessed: ${promptFormatPreprocessed}`)
        // console.log('information_extraction', Frm.get(variableName) )
        const html = preprocess(JSON.stringify(Frm.get(variableName)), { format: promptFormatPreprocessed } as PromptDefinitionType, undefined, true).text
        return <>
            <div className="alert alert-info ai-content mb-3" dangerouslySetInnerHTML={{ __html: html }} />
            <div className="row h-print mb-3">
                <div className="col"> <Button className="float-end" variant="info" onClick={() => Frm.set('information_extraction_editing', true)}>
                    Editar Informações Extraídas
                </Button>
                </div>
            </div>
        </>
    }


    return (<>
        <div className="alert alert-warning">
            <div className="row">
                {variables.map((variable, index) => (
                    variable.type === 'array-object'
                        ? <Array key={index} variable={variable} index={index} Frm={Frm} variableName={variableName} />
                        : <Variable key={index} variable={variable} index={index} Frm={Frm} variableName={variableName} />
                ))}
            </div>
        </div>
        {Frm.get(variableName) &&
            <div className="row h-print">
                <div className="col">
                    <Button className="float-end mb-3" variant="warning" onClick={() => Frm.set('information_extraction_editing', false)}>
                        Concluir a Edição
                    </Button>
                </div>
            </div>}
    </>
    )
}