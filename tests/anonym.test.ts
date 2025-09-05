import { anonymizeText } from '../lib/anonym/anonym'

describe('anonymizeText', () => {
	test('returns empty result for empty string', () => {
		const r = anonymizeText('')
		expect(r.text).toBe('')
		expect(r.substitutions).toBe(0)
	})

	test('numeric pattern anonymizes long digit sequences', () => {
		const r = anonymizeText('Processo 1234567890123', {
			numeric: true,
			identidade: false,
			endereco: false,
			telefoneFixo: false,
			telefoneMovel: false,
			email: false,
			oab: false,
			url: false,
			crm: false,
			names: false,
		})
		expect(r.text).toBe('Processo 000')
		expect(r.substitutions).toBe(1)
	})

		test('identidade pattern only when numeric disabled', () => {
		const r = anonymizeText('Identidade n. 12.345.678 apresentada.', {
			numeric: false,
			identidade: true,
			endereco: false,
			telefoneFixo: false,
			telefoneMovel: false,
			email: false,
			oab: false,
			url: false,
			crm: false,
			names: false,
		})
		// Only the numeric part is replaced; label kept
		expect(r.text).toBe('Identidade n. 000 apresentada.')
		expect(r.substitutions).toBe(1)
	})

	test('endereco pattern', () => {
		const r = anonymizeText('Endereço: Rua das Flores, n. 45.', {
			numeric: false,
			identidade: false,
			endereco: true,
			telefoneFixo: false,
			telefoneMovel: false,
			email: false,
			oab: false,
			url: false,
			crm: false,
			names: false,
		})
		expect(r.text).toBe('Endereço: ---.')
		expect(r.substitutions).toBe(1)
	})

	test('telefone fixo pattern', () => {
		const r = anonymizeText('Ligue 1234-5678 agora.', {
			numeric: false,
			identidade: false,
			endereco: false,
			telefoneFixo: true,
			telefoneMovel: false,
			email: false,
			oab: false,
			url: false,
			crm: false,
			names: false,
		})
		expect(r.text).toBe('Ligue 000 agora.')
		expect(r.substitutions).toBe(1)
	})

		test('telefone móvel pattern', () => {
		const r = anonymizeText('Ligue 91234-5678 agora.', {
			numeric: false,
			identidade: false,
			endereco: false,
			telefoneFixo: false,
			telefoneMovel: true,
			email: false,
			oab: false,
			url: false,
			crm: false,
			names: false,
		})
		expect(r.text).toBe('Ligue 000 agora.')
		expect(r.substitutions).toBe(1)
	})

	test('email pattern', () => {
		const r = anonymizeText('Email: teste@example.com.', {
			numeric: false,
			identidade: false,
			endereco: false,
			telefoneFixo: false,
			telefoneMovel: false,
			email: true,
			oab: false,
			url: false,
			crm: false,
			names: false,
		})
		expect(r.text).toBe('Email: ---.')
		expect(r.substitutions).toBe(1)
	})

	test('OAB pattern', () => {
		const r = anonymizeText('Adv: OAB/RJ 12345.', {
			numeric: false,
			identidade: false,
			endereco: false,
			telefoneFixo: false,
			telefoneMovel: false,
			email: false,
			oab: true,
			url: false,
			crm: false,
			names: false,
		})
		expect(r.text).toBe('Adv: OAB/RJ 000.')
		expect(r.substitutions).toBe(1)
	})

		test('URL pattern (protocol preserved, host replaced)', () => {
		const r = anonymizeText('Site: https://www.example.com.', {
			numeric: false,
			identidade: false,
			endereco: false,
			telefoneFixo: false,
			telefoneMovel: false,
			email: false,
			oab: false,
			url: true,
			crm: false,
			names: false,
		})
		expect(r.text).toBe('Site: https://---.')
		expect(r.substitutions).toBe(1)
	})

	test('CRM pattern', () => {
		const r = anonymizeText('CRM 123456 realizou o procedimento.', {
			numeric: false,
			identidade: false,
			endereco: false,
			telefoneFixo: false,
			telefoneMovel: false,
			email: false,
			oab: false,
			url: false,
			crm: true,
			names: false,
		})
		expect(r.text).toBe('CRM 000 realizou o procedimento.')
		expect(r.substitutions).toBe(1)
	})

	test('names disabled leaves names intact', () => {
		const r = anonymizeText('O paciente João relatou dor.', {
			numeric: false,
			identidade: false,
			endereco: false,
			telefoneFixo: false,
			telefoneMovel: false,
			email: false,
			oab: false,
			url: false,
			crm: false,
			names: false,
		})
		expect(r.text).toBe('O paciente João relatou dor.')
		expect(r.substitutions).toBe(0)
	})

	test('integration: multiple patterns including names', () => {
		const r = anonymizeText('João informou telefone 1234-5678 e email teste@example.com.', {
			// use defaults except disable numeric to avoid accidental capture
			numeric: false,
			identidade: false,
			endereco: false,
			telefoneFixo: true,
			telefoneMovel: true,
			email: true,
			oab: false,
			url: false,
			crm: false,
			names: true,
		})
		expect(r.text).toBe('J. informou telefone 000 e email ---.')
		// 1 (telefone) + 1 (email) + 1 (name group)
		expect(r.substitutions).toBe(3)
	})

	test('all options disabled returns original with zero substitutions', () => {
		const original = 'Texto com 1234567890, João, email teste@example.com.'
		const r = anonymizeText(original, {
			numeric: false,
			identidade: false,
			endereco: false,
			telefoneFixo: false,
			telefoneMovel: false,
			email: false,
			oab: false,
			url: false,
			crm: false,
			names: false,
		})
		expect(r.text).toBe(original)
		expect(r.substitutions).toBe(0)
	})
})
