import React from "react";
import { useTranslation } from 'react-i18next';

import Button, { ButtonRow } from "./Button";
import Form from "./Form";
import Input from "./Input";

import "./Modal.scss";


const Modal = ({ onHide, children, centre, small }) => {
    //const app = useContext(appContext);
    const doHide = hider => {
        return e => {
            //app.setModalOpen(false);
            if (hider)
                hider(e);
        };
    };

    return <div className={"modalWrap"}>
        {!small && <style>{"@media (max-width: 930px) {body{overflow: hidden; height: 100vh;}}"}</style>}
        <div className={"darken"} onMouseDown={(e => e.target.click())} onClick={doHide(onHide)} />
        <div className={"modalBoxWrap"}>
            {!small && <div className={"modalX"} onClick={doHide(onHide)}>&times;</div>}
            <div className={"modalBox" + (centre ? " centre" : "") + (small ? " small" : "")}>
                {children}
            </div>
        </div>
    </div>;
};


export const ModalPrompt = ({ body, promise, onHide, inputs }) => {
    const { t } = useTranslation();

    return <Modal onHide={() => {promise.reject(); onHide && onHide();}} small={body.small} centre>
        <p>
            { body.message }
            { inputs.length ? <br/> : null }
        </p>

        <Form handle={promise.resolve}>
            {inputs.map((i, n) => i.label ? <>
                <label htmlFor={i.name}>{i.label}</label>
                <Input key={n} width={'auto'} {...i} />
            </> : <Input key={n} width={'auto'} {...i} />)}

            <ButtonRow>
                <Button submit>{ body.okay || t("okay") }</Button>
                {!body.noCancel &&
                    <Button click={() => {promise.reject(); onHide && onHide();}}>{ body.cancel || t("cancel") }</Button>}
            </ButtonRow>
        </Form>
    </Modal>;
};


export default Modal;
