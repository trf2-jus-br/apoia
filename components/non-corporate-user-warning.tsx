import { getCurrentUser, isUserCorporativo } from '@/lib/user';
import React from 'react';
import { Container } from 'react-bootstrap';
import LayoutLogout from './layout-logout';
import Link from 'next/link';

// This is a React Server Component
export default async function NonCorporateUserWarning({ }: {}) {
    const user = await getCurrentUser()
    const corporateUser = user && !!await isUserCorporativo(user)
    if (corporateUser) return null
    return (
        <Container>
            <div className="alert alert-danger mt-5 text-center">
                Para acessar a Apoia, <LayoutLogout />.<br />
                O login via Gov.br não dá acesso à Apoia. <br />
                Para mais informações, consulte o <Link href="https://trf2.gitbook.io/apoia/entrando-na-apoia" className="alert-link">Manual da Apoia</Link>.
            </div>
        </Container>
    )
}