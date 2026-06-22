'use client'

import { Button, Dropdown, Form, Spinner } from 'react-bootstrap'
import ReactTextareaAutosize from 'react-textarea-autosize'
import { z, ZodTypeAny, ZodError } from 'zod';
import _ from 'lodash'
import { Dispatch, useState, useCallback, useRef, useEffect } from 'react';
// import dynamic from 'next/dynamic'
import Editor from '../../components/EditorComponent';

// Re-export server-compatible types and functions from form-state
export { type FormState, EMPTY_FORM_STATE, getPathReference, fromErrorToFormState } from './form-state'
import type { FormState } from './form-state'

type FieldErrorProps = {
    formState: FormState
    name: string
}

type FormErrorProps = {
    formState: FormState
}

const FieldError = ({ formState, name }: FieldErrorProps) => {
    if (!formState.fieldErrors || !formState.fieldErrors[name]) return ''
    return (
        <span className="text-danger">
            {formState.fieldErrors[name]?.[0]}
        </span>
    )
}

const FormError = ({ formState }: FormErrorProps) => {
    if (formState.status !== "ERROR") return ''
    return (
        <span className="text-danger align-middle">
            <strong>Erro! </strong>{formState?.message} <span style={{ display: 'none' }}>{JSON.stringify(formState)}</span>
        </span>
    )
}

export { FieldError, FormError }

// export const FormInput = ({ label, name, state, width }: { label: string, name: string, state: any, width?: number }) => {
//     return (
//         <Form.Group className={`mt-3 col col-12 col-md-${width || 12}`} controlId={name}>
//             <Form.Label className={this.compact ? 'mb-0' : ''}>{label}</Form.Label>
//             <Form.Control name={name} type="text" defaultValue={state[name]} placeholder="" />
//             <FieldError formState={state} name={name} />
//         </Form.Group>
//     )
// }

// export const FormTextArea = ({ label, name, state, width, onChange }: { label: string, name: string, state: any, onChange?, width?: number }) => {
//     return (
//         <Form.Group className={`mt-3 col col-12 col-md-${width || 12}`} controlId={name}>
//             <Form.Label className={this.compact ? 'mb-0' : ''}>{label}</Form.Label>
//             <ReactTextareaAutosize className="form-control" name={name} defaultValue={state[name]} placeholder="" onChange={onChange} />
//             <FieldError formState={state} name={name} />
//         </Form.Group>
//     )
// }

// export const FormSelect = ({ label, name, state, options, width }: { label: string, name: string, state: any, options: [{ id: number, name: string }], width?: number }) => {
//     return (
//         <Form.Group className={`mt-3 col col-12 col-md-${width || 12}`} controlId={name}>
//             <Form.Label className={this.compact ? 'mb-0' : ''}>{label}</Form.Label>
//             <Form.Select name={name} defaultValue={state[name]}>
//                 {options.map(c => (<option value={'' + c.id} key={c.id}  >{c.name}</option>))}
//             </Form.Select>
//             <FieldError formState={state} name={name} />
//         </Form.Group >
//     )
// }

// export const FormInput2 = ({ label, name, value, onChange, formState, width }: { label: string, name: string, value: any, onChange?, formState: FormState, width?: number }) => {
//     return (
//         <Form.Group className={`mt-3 col col-12 col-md-${width || 12}`} controlId={name} onChange={onChange}>
//             <Form.Label className={this.compact ? 'mb-0' : ''}>{label}</Form.Label>
//             <Form.Control name={name} type="text" value={value} placeholder="" />
//             <FieldError formState={formState} name={name} />
//         </Form.Group>
//     )
// }

// export const FormTextArea2 = ({ label, name, value, onChange, formState, width }: { label: string, name: string, value: any, onChange?, formState: FormState, width?: number }) => {
//     return (
//         <Form.Group className={`mt-3 col col-12 col-md-${width || 12}`} controlId={name}>
//             <Form.Label className={this.compact ? 'mb-0' : ''}>{label}</Form.Label>
//             <ReactTextareaAutosize className="form-control" name={name} value={value} placeholder="" onChange={onChange} />
//             <FieldError formState={formState} name={name} />
//         </Form.Group>
//     )
// }

// export const FormSelect2 = ({ label, name, value, onChange, formState, options, width }: { label: string, name: string, value: any, onChange?, formState: FormState, options: [{ id: number, name: string }], width?: number }) => {
//     return (
//         <Form.Group className={`mt-3 col col-12 col-md-${width || 12}`} controlId={name}>
//             <Form.Label className={this.compact ? 'mb-0' : ''}>{label}</Form.Label>
//             <Form.Select name={name} value={value} onChange={onChange}>
//                 {options.map(c => (<option value={c.id} key={c.id}  >{c.name}</option>))}
//             </Form.Select>
//             <FieldError formState={formState} name={name} />
//         </Form.Group >
//     )
// }

// Componente AsyncSelect standalone para uso com hooks
interface AsyncSelectComponentProps<T> {
    label: string
    name: string
    searchFn: (query: string) => Promise<T[]>
    formatOption: (item: T) => string
    formatSelected?: (item: T) => string
    minSearchLength?: number
    width?: number | string
    visible?: boolean
    explanation?: string
    getValue: () => T | null
    setValue: (value: T | null) => void
    colClass: (width?: string | number) => string
    compact: boolean
    formState: FormState
}

function AsyncSelectComponent<T>({
    label,
    name,
    searchFn,
    formatOption,
    formatSelected,
    minSearchLength = 3,
    width,
    visible,
    explanation,
    getValue,
    setValue,
    colClass,
    compact,
    formState
}: AsyncSelectComponentProps<T>) {
    const [searchQuery, setSearchQuery] = useState('')
    const [options, setOptions] = useState<T[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedValue = getValue()

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSearch = useCallback(async (query: string) => {
        if (query.length < minSearchLength) {
            setOptions([])
            return
        }

        setIsLoading(true)
        try {
            const results = await searchFn(query)
            setOptions(results)
            setShowDropdown(true)
        } catch (error) {
            console.error('Erro na busca:', error)
            setOptions([])
        } finally {
            setIsLoading(false)
        }
    }, [searchFn, minSearchLength])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value
        setSearchQuery(query)

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(() => {
            handleSearch(query)
        }, 1000)
    }

    const handleSelect = (item: T) => {
        setValue(item)
        setSearchQuery('')
        setOptions([])
        setShowDropdown(false)
    }

    const handleClear = () => {
        setValue(null)
        setSearchQuery('')
    }

    const displayFormatter = formatSelected || formatOption

    return (
        <Form.Group className={`${colClass(width)} ${visible === false ? 'd-none' : ''}`} controlId={name} ref={containerRef}>
            <Form.Label className={compact ? 'mb-0' : ''}>{label}</Form.Label>
            {selectedValue ? (
                <div className="d-flex align-items-center gap-2">
                    <div className="form-control bg-light flex-grow-1" style={{ cursor: 'default' }}>
                        {displayFormatter(selectedValue)}
                    </div>
                    <Button variant="outline-secondary" size="sm" onClick={handleClear} title="Limpar seleção">
                        &times;
                    </Button>
                </div>
            ) : (
                <div className="position-relative">
                    <div className="d-flex align-items-center">
                        <Form.Control
                            type="text"
                            value={searchQuery}
                            onChange={handleInputChange}
                            onFocus={() => options.length > 0 && setShowDropdown(true)}
                            placeholder={`Digite ao menos ${minSearchLength} caracteres para buscar...`}
                        />
                        {isLoading && (
                            <Spinner animation="border" size="sm" className="position-absolute" style={{ right: '10px' }} />
                        )}
                    </div>
                    {showDropdown && options.length > 0 && (
                        <div className="position-absolute w-100 bg-white border rounded shadow-sm" style={{ zIndex: 1000, maxHeight: '300px', overflowY: 'auto' }}>
                            {options.map((item, index) => (
                                <div
                                    key={index}
                                    className="p-2 border-bottom"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleSelect(item)}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                                >
                                    {formatOption(item)}
                                </div>
                            ))}
                        </div>
                    )}
                    {showDropdown && searchQuery.length >= minSearchLength && options.length === 0 && !isLoading && (
                        <div className="position-absolute w-100 bg-white border rounded shadow-sm p-2 text-muted" style={{ zIndex: 1000 }}>
                            Nenhum resultado encontrado
                        </div>
                    )}
                </div>
            )}
            <FieldError formState={formState} name={name} />
            {explanation && <Form.Text className="text-body-tertiary ms-1">{explanation}</Form.Text>}
        </Form.Group>
    )
}

// Componente AsyncMultiSelect standalone para uso com hooks — armazena T[]
interface AsyncMultiSelectComponentProps<T> {
    label: string
    name: string
    searchFn: (query: string) => Promise<T[]>
    formatOption: (item: T) => string
    formatSelected?: (item: T) => string
    minSearchLength?: number
    width?: number | string
    visible?: boolean
    explanation?: string
    keyFn?: (item: T) => string
    getValue: () => T[]
    setValue: (value: T[]) => void
    colClass: (width?: string | number) => string
    compact: boolean
    formState: FormState
}

function AsyncMultiSelectComponent<T>({
    label,
    name,
    searchFn,
    formatOption,
    formatSelected,
    minSearchLength = 3,
    width,
    visible,
    explanation,
    keyFn,
    getValue,
    setValue,
    colClass,
    compact,
    formState
}: AsyncMultiSelectComponentProps<T>) {
    const [searchQuery, setSearchQuery] = useState('')
    const [options, setOptions] = useState<T[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedValues: T[] = getValue() || []
    const displayFormatter = formatSelected || formatOption

    const getItemKey = (item: T): string => {
        if (keyFn) return keyFn(item)
        if (item && typeof item === 'object' && 'id' in (item as object)) return String((item as any).id)
        try {
            return JSON.stringify(item)
        } catch {
            return String(Math.random())
        }
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSearch = useCallback(async (query: string) => {
        if (query.length < minSearchLength) {
            setOptions([])
            return
        }

        setIsLoading(true)
        try {
            const results = await searchFn(query)
            setOptions(results)
            setShowDropdown(true)
        } catch (error) {
            console.error('Erro na busca:', error)
            setOptions([])
        } finally {
            setIsLoading(false)
        }
    }, [searchFn, minSearchLength])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value
        setSearchQuery(query)

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(() => {
            handleSearch(query)
        }, 1000)
    }

    const handleSelect = (item: T) => {
        const key = getItemKey(item)
        const exists = selectedValues.some(v => getItemKey(v) === key)
        if (exists) return

        setValue([...selectedValues, item])
        setSearchQuery('')
        setOptions([])
        setShowDropdown(false)
    }

    const handleRemove = (idx: number) => {
        setValue(selectedValues.filter((_, i) => i !== idx))
    }

    const handleClearAll = () => {
        setValue([])
        setSearchQuery('')
    }

    return (
        <Form.Group className={`${colClass(width)} ${visible === false ? 'd-none' : ''}`} controlId={name} ref={containerRef}>
            <Form.Label className={compact ? 'mb-0' : ''}>{label}</Form.Label>
            {selectedValues.length > 0 && (
                <div className="mb-2 d-flex flex-wrap gap-2 align-items-center">
                    {selectedValues.map((item, idx) => (
                        <span
                            key={idx}
                            className="badge bg-secondary d-inline-flex align-items-center"
                            style={{ fontSize: '0.875rem', fontWeight: 'normal', padding: '0.4rem 0.6rem' }}
                        >
                            {displayFormatter(item)}
                            <button
                                type="button"
                                className="btn-close btn-close-white ms-2"
                                style={{ fontSize: '0.65rem' }}
                                onClick={() => handleRemove(idx)}
                                aria-label={`Remover ${displayFormatter(item)}`}
                            />
                        </span>
                    ))}
                    <Button variant="link" size="sm" onClick={handleClearAll} className="p-0 text-decoration-none">
                        Limpar todos
                    </Button>
                </div>
            )}
            <div className="position-relative">
                <div className="d-flex align-items-center">
                    <Form.Control
                        type="text"
                        value={searchQuery}
                        onChange={handleInputChange}
                        onFocus={() => options.length > 0 && setShowDropdown(true)}
                        placeholder={`Digite ao menos ${minSearchLength} caracteres para buscar...`}
                    />
                    {isLoading && (
                        <Spinner animation="border" size="sm" className="position-absolute" style={{ right: '10px' }} />
                    )}
                </div>
                {showDropdown && options.length > 0 && (
                    <div className="position-absolute w-100 bg-white border rounded shadow-sm" style={{ zIndex: 1000, maxHeight: '300px', overflowY: 'auto' }}>
                        {options.map((item, index) => {
                            const key = getItemKey(item)
                            const isSelected = selectedValues.some(v => getItemKey(v) === key)
                            return (
                                <div
                                    key={index}
                                    className={`p-2 border-bottom ${isSelected ? 'text-muted' : ''}`}
                                    style={{ cursor: isSelected ? 'default' : 'pointer' }}
                                    onClick={() => !isSelected && handleSelect(item)}
                                    onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                                >
                                    {formatOption(item)}
                                    {isSelected && <small className="ms-2">(já selecionado)</small>}
                                </div>
                            )
                        })}
                    </div>
                )}
                {showDropdown && searchQuery.length >= minSearchLength && options.length === 0 && !isLoading && (
                    <div className="position-absolute w-100 bg-white border rounded shadow-sm p-2 text-muted" style={{ zIndex: 1000 }}>
                        Nenhum resultado encontrado
                    </div>
                )}
            </div>
            <FieldError formState={formState} name={name} />
            {explanation && <Form.Text className="text-body-tertiary ms-1">{explanation}</Form.Text>}
        </Form.Group>
    )
}

export class FormHelper {
    data: any;
    setData: (data: any) => void;
    formState: FormState;
    compact: boolean;

    constructor(compact?: boolean) {
        this.compact = compact || false;
    }


    public update = (data: any, setData: (data: any) => void, formState: FormState) => {
        this.data = data;
        this.setData = setData;
        this.formState = formState;
    }

    // constructor(data: any, setData: (data: any) => void, formState: FormState) {
    //     this.data = data;
    //     this.setData = setData;
    //     this.formState = formState;
    // }

    public get = (name: string) => {
        return _.get(this.data, name)
    }

    public set = (name: string, value: any) => {
        const newData = { ...this.data }
        _.set(newData, name, value)
        this.setData(newData)
        this.data = newData
    }

    public colClass = (width?: string | number) => `${this.compact ? 'mb-0' : 'mt-3'} col ${typeof width === 'string' ? width : `col-12 col-md-${width || 12}`}`

    public Input = ({ label, name, validator, width, visible, explanation, maxLength }: { label: string, name: string, visible?: boolean, explanation?: string, validator?: (value: string, name: string) => string | undefined, width?: number | string, maxLength?: number }) => {
        return (
            <Form.Group className={`${this.colClass(width)} ${visible === false ? 'd-none' : ''}`} controlId={name}>
                <Form.Label className={this.compact ? 'mb-0' : ''}>{label}</Form.Label>
                <Form.Control
                    name={name}
                    type="text"
                    value={this.get(name) ?? ''}
                    onChange={e => { this.set(name, e.target.value); validator && validator(e.target.value, name) }}
                    placeholder=""
                    maxLength={maxLength}
                    key={name} />
                <FieldError formState={this.formState} name={name} />
                {explanation && <Form.Text className="text-body-tertiary ms-1">{explanation}</Form.Text>}
            </Form.Group>
        )
    }

    public Checkbox = ({ label, name, width, visible, explanation, topLabel = '&nbsp;' }: { label: string, name: string, width?: number | string, visible?: boolean, explanation?: string, topLabel?: string }) => {
        return (
            <Form.Group className={`${this.colClass(width)} ${visible === false ? 'd-none' : ''}`} controlId={name}>
                {topLabel != '' && <Form.Label className={this.compact ? 'mb-0' : ''}><span dangerouslySetInnerHTML={{ __html: topLabel }} /></Form.Label>}
                <Form.Check
                    type="checkbox"
                    id={name}
                    label={label}
                    checked={!!this.get(name)}
                    onChange={e => this.set(name, e.target.checked)}
                    className='mt-2'
                />
                <FieldError formState={this.formState} name={name} />
                {explanation && <Form.Text className="text-body-tertiary ms-1">{explanation}</Form.Text>}
            </Form.Group>
        )
    }

    public TextArea = ({ label, name, width, maxRows, explanation }: { label: string, name: string, width?: number | string, maxRows?: number, explanation?: string }) => {
        return (
            <Form.Group className={this.colClass(width)} controlId={name}>
                <Form.Label className={this.compact ? 'mb-0' : ''}>{label}</Form.Label>
                <ReactTextareaAutosize className="form-control" name={name} value={this.get(name)} onChange={e => this.set(name, e.target.value)} placeholder="" key={name} />
                <FieldError formState={this.formState} name={name} />
                {explanation && <Form.Text className="text-body-tertiary ms-1">{explanation}</Form.Text>}
            </Form.Group>
        )
    }

    public Markdown = ({ label, name, width, maxRows, explanation }: { label: string, name: string, width?: number | string, maxRows?: number, explanation?: string }) => {
        // const EditorComp = dynamic(() => import('../../components/EditorComponent'), { ssr: false })

        return (
            <Form.Group className={this.colClass(width)} controlId={name}>
                <Form.Label className={this.compact ? 'mb-0' : ''}>{label}</Form.Label>
                <Editor markdown={this.get(name) || ''} onChange={e => this.set(name, e)} key={name} />
                <FieldError formState={this.formState} name={name} />
                {explanation && <Form.Text className="text-body-tertiary ms-1">{explanation}</Form.Text>}
            </Form.Group>
        )
    }

    public Select = ({ label, name, options, width, visible }: { label: string, name: string, options: { id: number | string, name: string, disabled?: boolean, hidden?: boolean }[], visible?: boolean, width?: number | string }) => {
        return (
            <Form.Group className={`${this.colClass(width)} ${visible === false ? 'd-none' : ''}`} controlId={name}>
                <Form.Label className={this.compact ? 'mb-0' : ''}>{label}</Form.Label>
                <Form.Select name={name} value={this.get(name) || ''} onChange={e => this.set(name, e.target.value)}>
                    {options.map(c => (<option value={c.id} key={c.id} disabled={c.disabled === true} hidden={c.hidden === true}>{c.name}</option>))}
                </Form.Select>
                <FieldError formState={this.formState} name={name} />
            </Form.Group >
        )
    }

    public MultiSelect = ({ label, name, options, width, visible, displayCount }: { label: string, name: string, options: { id: number | string, name: string, disabled?: boolean }[], visible?: boolean, width?: number | string, displayCount?: number }) => {

        const change = (event) => {
            const id = event.target.value;
            const choosen = event.target.checked;

            if (choosen) {
                this.set(name, [...(this.get(name) || []), id]);
            } else {
                this.set(name, (this.get(name) || []).filter((i) => i !== id));
            }
        };

        const getDisplayText = () => {
            const selectedIds = this.get(name) || [];
            if (selectedIds.length === 0) return 'Selecione';
            if (selectedIds.length === options.length && options.length > 0) return 'Todos';

            if (displayCount && displayCount > 0) {
                const selectedNames = selectedIds.map((id: any) => options.find(o => o.id == id)?.name).filter(Boolean);
                const namesToShow = selectedNames.slice(0, displayCount).join(', ');
                const remaining = selectedIds.length - displayCount;

                if (remaining > 0) {
                    return `${namesToShow} + ${remaining}`;
                }
                return namesToShow;
            }

            return `${selectedIds.length} selecionado${selectedIds.length > 1 ? 's' : ''}`;
        };

        return (
            <Form.Group className={`${this.colClass(width)} ${visible === false ? 'd-none' : ''}`} controlId={name}>
                <Form.Label className={this.compact ? 'mb-0' : ''}>{label}</Form.Label>
                <Dropdown>
                    <Dropdown.Toggle as='span' variant="light" id="dropdown-basic" className='form-control'>
                        {getDisplayText()}
                    </Dropdown.Toggle>

                    <Dropdown.Menu className="ps-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {options.map((option) => (
                            <Form.Check
                                className="custom-checkbox ml-3"
                                key={option.id}
                                type="checkbox"
                                id={`option_${option.id}`}
                                label={option.name}
                                checked=
                                {(this.get(name) || []).includes(option.id)}
                                onChange={change}
                                value={option.id}
                            />
                        ))}
                    </Dropdown.Menu>
                </Dropdown>
                {/* {JSON.stringify(this.get(name))} */}
                <FieldError formState={this.formState} name={name} />
            </Form.Group >
        )
    }

    public AsyncSelect = <T,>(props: {
        label: string,
        name: string,
        searchFn: (query: string) => Promise<T[]>,
        formatOption: (item: T) => string,
        formatSelected?: (item: T) => string,
        minSearchLength?: number,
        width?: number | string,
        visible?: boolean,
        explanation?: string
    }) => {
        return (
            <AsyncSelectComponent<T>
                {...props}
                getValue={() => this.get(props.name)}
                setValue={(value) => this.set(props.name, value)}
                colClass={(width) => this.colClass(width)}
                compact={this.compact}
                formState={this.formState}
            />
        )
    }

    public AsyncMultiSelect = <T,>(props: {
        label: string,
        name: string,
        searchFn: (query: string) => Promise<T[]>,
        formatOption: (item: T) => string,
        formatSelected?: (item: T) => string,
        minSearchLength?: number,
        width?: number | string,
        visible?: boolean,
        explanation?: string,
        keyFn?: (item: T) => string
    }) => {
        return (
            <AsyncMultiSelectComponent<T>
                {...props}
                getValue={() => this.get(props.name) || []}
                setValue={(value) => this.set(props.name, value)}
                colClass={(width) => this.colClass(width)}
                compact={this.compact}
                formState={this.formState}
            />
        )
    }

    public CheckBoxes = ({ label, labelsAndNames, onClick, width }: { label: string, labelsAndNames: { label: string, name: string }[], onClick?: (label: string, name: string, checked: boolean) => void, width?: number | string }) => {
        return this.setData ? (
            <div className={this.colClass(width)}>
                <Form.Label>{label}</Form.Label>
                {labelsAndNames.filter(c => c != null).map((c, idx) => {
                    return (
                        <Form.Check key={c.name} type="checkbox" label={c.label} checked={this.get(c.name)} onChange={e => { this.set(c.name, e.target.checked); if (onClick) onClick(c.label, c.name, e.target.checked) }} />
                    )
                })}
            </div>
        ) : (
            <div className={this.colClass(width)}>
                <Form.Label>{label}</Form.Label>
                <table className="table table-bordered">
                    <tbody>
                        {labelsAndNames.filter(c => c != null).map((c, idx) => {
                            return (
                                <tr key={c.name}>
                                    <td>{c.label}</td>
                                    <td><strong>{this.get(c.name) ? 'Sim' : 'Não'}</strong></td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )
    }

    public Button = ({ onClick, variant, children }: { onClick: () => void, variant?: string, children }) => {
        return (<div className="col col-auto mt-3">
            <label className="form-label">&nbsp;</label><br />
            <Button variant={variant || 'light'} onClick={onClick}>{children}</Button>
        </div>)
    }

}

