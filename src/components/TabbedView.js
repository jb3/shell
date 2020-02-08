import React, { useState } from "react";

import Button from "./Button";

import "./TabbedView.scss";


export const Tab = ({ label, children }) => children;

export default ({ center, children, callback, initial }) => {
    const [active, setActive] = useState(initial || 0);

    return (<>
        <div className={"buttonRow tabButtonRow" + (center ? " centre" : "")}>
            {children.map((c, i) =>
                c && c.props.label ?
                    <Button key={i} click={(() => { if (active !== i) { setActive(i); callback && callback(i); } })}
                        medium className={i === active ? "active" : ""}>
                        {c.props.label}</Button>
                    : c)}
            <div className={"tabSpacer"} />
        </div>
        {children.map((i, n) =>
            <div key={n} style={{ display: n === active ? "block" : "none" }} className={"tabWrap"}>
                {i}
            </div>
        )}
    </>);
};
