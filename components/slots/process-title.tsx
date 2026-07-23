import { faEdit, faRemove } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Container, Navbar } from 'react-bootstrap'

export default function ProcessTitle(params: { id: string | number, onRemove?: () => void }) {
    const id = (params?.id?.toString() || '').replace(/[^0-9]/g, '')
    const onRemove = params?.onRemove

    return (
        <div className="text-center">
            <span className="h1">
                Processo {process.env.NAVIGATE_TO_PROCESS_URL ? (<a href={process.env.NAVIGATE_TO_PROCESS_URL.replace('{numero}', id)} style={{ color: 'rgb(33, 37, 41)', textDecoration: 'none' }}>{id}</a>) : id}
            </span>
            {/* {onRemove && (<>&nbsp;- <span onClick={() => { onRemove() }} className="text-primary" style={{ cursor: 'pointer' }}><FontAwesomeIcon icon={faRemove} /> Remover</span></>)} */}
        </div>
    )
    // return (
    //     <Navbar bg="primary" expand="lg" className="mb-3">
    //         <Container fluid={false}>
    //             <div className="navbar-brand text-white" style={{ textDecoration: "none", fontSize: "120%", verticalAlign: "middle" }}>
    //                 Processo {id}
    //                 {envString('NAVIGATE_TO_PROCESS_URL') && (<>&nbsp;<a href={envString('NAVIGATE_TO_PROCESS_URL').replace('{numero}', id)} className="text-white" type="submit"><FontAwesomeIcon icon={faUpRightFromSquare} /></a></>)}
    //             </div>
    //         </Container>
    //     </Navbar >
    // )
}