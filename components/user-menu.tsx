import 'server-only'

import authOptions from '../app/api/auth/[...nextauth]/options'
import { getServerSession } from 'next-auth';
import { NavItem } from 'react-bootstrap';
import Link from 'next/link'
import UserMenuSignout from './user-menu-signout'
import { unstable_noStore as noStore } from 'next/cache'
import { NavigationLink } from './NavigationLink';
import { encryptWithDatabaseSecret, envString, envStringPrefixed } from '@/lib/utils/env';
import { maiusculasEMinusculas, primeiroEUltimoNome } from '@/lib/utils/utils';
import WootricSurvey from './wootric-survey';
import { assertCourtId, getCurrentUser, isUserCorporativo, isUserModerator } from '@/lib/user';
import { getSelectedModelName, getSelectedModelParams } from '@/lib/ai/model-server';
import { getAnonymize, getMode, getModeUrl, isBetaTester } from '@/lib/utils/prefs';
import ErrorSpan from './error-span';
import TicketFormButton from './ticket-form';
import UserMenuAnonymize from './user-menu-anonymize';
import UserMenuBetaTester from './user-menu-beta-tester';
import UserMenuMode from './user-menu-mode';
import ModeLink from './mode-link';

export default async function UserMenu({ }: {}) {
    noStore()
    try {
        const session = await getServerSession(authOptions);
        // if (!session) return <NavItem>
        //     <NavigationLink href="/auth/signin" text="Login" />
        // </NavItem>

        const model = await getSelectedModelName()
        const user = await getCurrentUser()
        const corporateUser = user && !!await isUserCorporativo(user)
        const apiKeyProvided = !!(await getSelectedModelParams()).apiKey
        const isAnonymized = await getAnonymize()
        const mode = await getMode()
        const betaTester = await isBetaTester()
        const isAdministrative = mode === 'ADMINISTRATIVO'

        const seqTribunalPai = user ? '' + (assertCourtId(user)) : undefined
        const hasSeiApiUrl = !!envStringPrefixed('SEI_API_URL', seqTribunalPai)

        const nonCorporateUser = user && !(await isUserCorporativo(user))
        const moderator = user ? await isUserModerator(user) : false
        const modeUrl = await getModeUrl()



        return (<>
            {user && corporateUser && <div className="collapse navbar-collapse" id="navbarSupportedContent">
                <NavItem>
                    <NavigationLink href={modeUrl("/chat")} text="<u>C</u>hat" accessKey="c" />
                </NavItem>
                <NavItem>
                    <NavigationLink href={modeUrl(`/prompts/reset`)} text="<u>P</u>rompts" accessKey="p" />
                </NavItem>
                <NavItem>
                    <NavigationLink href={modeUrl("/revision")} text="Revisão de <u>T</u>exto" accessKey="t" />
                </NavItem>
                {!isAdministrative &&
                    <NavItem>
                        <NavigationLink href={modeUrl("/headnote")} text="E<u>m</u>enta" accessKey="m" />
                    </NavItem>}
            </div>}

            <ul className="navbar-nav me-1 mb-2x mb-lg-0x">
                {((envString('ACCESS_ARENA') || '').split(';').includes(user?.name) || user?.roles?.includes('apoia-role-arena')) &&
                    (<NavItem>
                        <NavigationLink href={modeUrl("/arena")} text="Arena" />
                    </NavItem>)}
                <li className="nav-item dropdown">
                    {!user
                        ? <Link className="dropdown-item" href="/auth/signin">Login</Link>
                        : <>{
                            user
                                ?
                                <a className="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    {user?.system ? `${user?.name}/${user?.system}` : `${maiusculasEMinusculas(primeiroEUltimoNome(user?.name))}/PDPJ`}
                                </a>
                                : <a className="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    Configurações
                                </a>}
                            <ul className="dropdown-menu  dropdown-menu-end" aria-labelledby="navbarDropdown">
                                <li><ModeLink className="dropdown-item" href="/prefs">Modelo de IA{model && ` (${model})`}</ModeLink></li>
                                <UserMenuAnonymize isAnonymized={isAnonymized} />
                                {hasSeiApiUrl && <UserMenuMode />}
                                {betaTester && <UserMenuBetaTester isBetaTester={betaTester} />}
                                {user && <li><TicketFormButton label="Ajuda / Abrir chamado" className="dropdown-item" userName={user.name} userEmail={user.email} /></li>}
                                {user && <li><ModeLink className="dropdown-item" href="/tickets">Meus chamados</ModeLink></li>}
                                {!user && <li><ModeLink className="dropdown-item" href="/auth/signin">Login</ModeLink></li>}
                                {user && <li><UserMenuSignout /></li>}
                                {moderator && <>
                                    <hr className="mt-2 mb-2" />
                                    <li><ModeLink className="dropdown-item" href="/admin/tickets">Chamados (moderação)</ModeLink></li>
                                    <li><ModeLink className="dropdown-item" href="/admin/evaluations">Avaliações de IA</ModeLink></li>
                                    <li><ModeLink className="dropdown-item" href="/admin/court">Tribunais</ModeLink></li>
                                    <li><ModeLink className="dropdown-item" href="/admin/edit-prompt">Edição de Prompts</ModeLink></li>
                                    <li><ModeLink className="dropdown-item" href="/admin/transfer-prompt">Transferência de Prompts</ModeLink></li>
                                </>}
                                {user && corporateUser && apiKeyProvided && envString('WOOTRIC_ACCOUNT_TOKEN') && <WootricSurvey user={user} token={envString('WOOTRIC_ACCOUNT_TOKEN')} />}
                            </ul></>
                    }
                </li>
            </ul>
        </>)
    } catch (error) {
        const encrypted = encryptWithDatabaseSecret(error.stack as string)
        return (
            <ul className="navbar-nav me-1 mb-2x mb-lg-0x">
                <li className="nav-item dropdown">
                    <a className="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Configurações
                    </a>
                    <ul className="dropdown-menu  dropdown-menu-end" aria-labelledby="navbarDropdown">
                        <li><ModeLink className="dropdown-item" href="/prefs">Modelo de IA</ModeLink></li>
                        <li className="dropdown-item"><ErrorSpan encrypted={encrypted} /></li>
                    </ul>
                </li>
            </ul>
        );
    }
}