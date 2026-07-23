export const ResumoDePecaLoading = () => {
    // <span className="col-4 placeholder me-2"></span>
    // <span className="col-6 placeholder me-2"></span>
    // <span className="col-8 placeholder me-2"></span>
    return <div className="alert alert-secondary placeholder-glow" role="status" aria-hidden="true">
        <span className="visually-hidden">Carregando...</span>
        <div className="row">
            <div className="col-5"><div className="placeholder w-100"></div></div>
            <div className="col-4"><div className="placeholder w-100"></div></div>
            <div className="col-3"><div className="placeholder w-100"></div></div>
        </div>
    </div>
}

export const ProdutoLoading = () => {
    return (<>
        <span className="visually-hidden">Carregando...</span>
        <h2>
            <div className="placeholder-glow" aria-hidden="true">
                <div className="row">
                    <div className="col-2"><div className="placeholder w-100"></div></div>
                </div>
            </div>
        </h2>
        {ResumoDePecaLoading()}
    </>)
}

