import React, { useState, useContext } from "react";
import { Redirect } from "react-router-dom";

import { SectionTitle2 } from "../../components/Misc";
import useReactRouter from "../../useReactRouter";
import Modal from "../../components/Modal";
import Page from "./bases/Page";

import {
    plugins, Button, ButtonRow, apiContext, apiEndpoints, Input, Form,
    FormError, SBTSection, Section, appContext, Link
} from "ractf";

import "./Campaign.scss";


const ANC = ({ hide, anc, modal }) => {
    const endpoints = useContext(apiEndpoints);
    const app = useContext(appContext);
    const [locked, setLocked] = useState(false);
    const [error, setError] = useState("");
    const { history } = useReactRouter();

    const create = ({ cname, cdesc, ctype }) => {
        if (!cname.length)
            return setError("No name provided!");
        if (!ctype.length || !plugins.categoryType[ctype])
            return setError("Invalid category type!\nValid types: " + Object.keys(plugins.categoryType).join(", "));

        setLocked(true);

        (anc.id ? endpoints.editGroup(anc.id, cname, cdesc, ctype)
            : endpoints.createGroup(cname, cdesc, ctype)).then(async resp => {
                await endpoints.setup(true);
                if (hide)
                    hide();
            }).catch(e => {
                setError(endpoints.getError(e));
                setLocked(false);
            });
    };
    const removeCategory = () => {
        app.promptConfirm({
            message: "Are you sure you want to remove the category:\n" + anc.name,
            small: true
        }).then(async () => {
            app.showProgress("Removing challenges...", 0);
            let progress = 0;
            await Promise.all(anc.challenges.map(i => {
                return endpoints.removeChallenge(i, true).then(() => {
                    progress += 1 / anc.challenges.length;
                    app.showProgress("Removing challenges...", progress);
                });
            }));
            app.showProgress("Removing category...", .5);
            await endpoints.removeGroup(anc.id);
            history.push("/campaign");
            app.alert("Category removed!");
        }).catch(e => {
            app.alert("Something went wrong removing the category:\n" + endpoints.getError(e));
        });
        hide();
    };

    let body = <Form locked={locked} handle={create}>
        {modal && <SectionTitle2>{anc.id ? "Edit" : "Add new"} category</SectionTitle2>}
        <label htmlFor={"cname"}>Catgeory name</label>
        <Input val={anc.name} name={"cname"} placeholder={"Catgeory name"} />
        <label htmlFor={"cdesc"}>Catgeory brief</label>
        <Input val={anc.description} name={"cdesc"} rows={5} placeholder={"Category brief"} />
        <label htmlFor={"ctype"}>Catgeory type</label>
        <Input val={anc.contained_type} name={"ctype"} format={{ test: i => !!plugins.categoryType[i] }}
            placeholder={"Category type"} />
        {error && <FormError>{error}</FormError>}
        <ButtonRow>
            {anc.id &&
                <Button warning click={removeCategory}>Remove Category</Button>
            }
            <Button submit>{anc.id ? "Edit" : "Add"} Category</Button>
        </ButtonRow>
    </Form>;

    if (modal)
        return <Modal onHide={hide} title={"Add new challenge"}>
            {body}
        </Modal>;
    return body;
};


const CategoryList = () => {
    const api = useContext(apiContext);

    return <Page>
        <SBTSection subTitle={"Pick one of the categories below to get started"} title={"All Categories"}>
            {api.challenges.map(i => {
                let solved = i.challenges.filter(j => j.solved).length;
                return <Link key={i.id} to={"/campaign/" + i.id}
                             className={"catList" + (solved === i.challenges.length ? " catDone" : "")}>
                    <div className={"catName"}>{i.name}</div>
                    <div className={"catStat"}>{
                        solved === i.challenges.length ? "All challenges completed" :
                        solved === 0 ? "No challenges completed" :
                        `${solved} of ${i.challenges.length} challenge${i.challenges.length === 1 ? "" : "s"} completed`
                    }</div>
                </Link>;
            })}
        </SBTSection>
    </Page>;
};


export default () => {
    const [challenge, setChallenge] = useState(null);
    const [edit, setEdit] = useState(false);
    const [isEditor, setIsEditor] = useState(false);
    const [isCreator, setIsCreator] = useState(false);
    const [lState, setLState] = useState({});
    const [anc, setAnc] = useState(false);

    const { match } = useReactRouter();
    const tabId = match.params.tabId;

    const endpoints = useContext(apiEndpoints);
    const app = useContext(appContext);
    const api = useContext(apiContext);

    if (tabId === "new" && api.user.is_staff)
        return <Page><SBTSection key={"anc"} title={"Add new category"} noHead>
            <Section light title={"Add new category"}>
                <ANC anc={true} />
            </Section>
        </SBTSection></Page>;
    else if (!tabId) {
        return <CategoryList />;
    }

    const showEditor = (challenge, saveTo, isNew) => {
        return () => {
            setChallenge(challenge || {});
            setLState({
                saveTo: saveTo
            });
            setIsEditor(true);
            setIsCreator(!!isNew);
        };
    };

    const hideChal = () => {
        setChallenge(null);
        setIsEditor(false);
    };

    const saveEdit = (original) => {
        return changes => {
            let flag;
            try {
                flag = JSON.parse(changes.flag_metadata);
            } catch (e) {
                if (!changes.flag_metadata.length) flag = "";
                else return app.alert("Invalid flag JSON");
            }

            (isCreator ? endpoints.createChallenge : endpoints.editChallenge)({
                ...original, ...changes, id: (isCreator ? tabId : original.id), flag_metadata: flag
            }).then(async () => {
                for (let i in changes)
                    original[i] = changes[i];
                if (lState.saveTo)
                    lState.saveTo.push(original);

                await endpoints.setup();
                setIsEditor(false);
                setChallenge(null);
            }).catch(e => app.alert(endpoints.getError(e)));
        };
    };

    const removeChallenge = (challenge) => {
        return () => {
            app.promptConfirm({message: "Remove challenge:\n" + challenge.name, small: true}).then(() => {
                endpoints.removeChallenge(challenge).then(() => {
                    app.alert("Challenge removed");
                    setIsEditor(false);
                    setChallenge(null);
                }).catch(e => {
                    app.alert("Error removing challenge:\n" + endpoints.getError(e));
                });
            }).catch(() => { });
        };
    };

    if (!api.challenges)
        api.challenges = [];

    let tab = (() => {
        for (let i in api.challenges)
            if (api.challenges[i].id.toString() === tabId) return api.challenges[i];
    })();
    let chalEl, handler, challengeTab;

    if (!tab) {
        if (!api.challenges || !api.challenges.length) return <></>;
        return <Redirect to={"/404"} />;
    }
    handler = plugins.categoryType[tab.contained_type];
    if (!handler) {
        challengeTab = <>
            Category renderer for type "{tab.contained_type}" missing!<br /><br />
            Did you forget to install a plugin?
        </>;
    } else {
        challengeTab = React.createElement(
            handler.component, { challenges: tab, showEditor: showEditor, isEdit: edit }
        );
    }

    if (challenge || isEditor) {
        if (challenge.type)
            handler = plugins.challengeType[challenge.type];
        else
            handler = plugins.challengeType["default"];

        if (!handler)
            chalEl = <>
                Challenge renderer for type "{challenge.type}" missing!<br /><br />
                Did you forget to install a plugin?
            </>;
        else {
            chalEl = React.createElement(
                handler.component, {
                challenge: challenge, doHide: hideChal,
                isEditor: isEditor, saveEdit: saveEdit,
                removeChallenge: removeChallenge(challenge),
                isCreator: isCreator,
            });
        }

        chalEl = <Modal onHide={hideChal}>
            {chalEl}
        </Modal>;
    }

    return <Page title={"Challenges"}>
        {chalEl}
        {anc && <ANC modal anc={anc} hide={() => setAnc(false)} />}

        <SBTSection key={tab.id} subTitle={tab.description} title={tab.name}>
            {api.user.is_staff ? edit ?
                <Button className={"campEditButton"} click={() => { setEdit(false); endpoints.setup(true); }} warning>
                    Stop Editing
                </Button> : <Button className={"campEditButton"} click={() => { setEdit(true); }} warning>
                    Edit
                </Button> : null}
            {edit && <Button className={"campUnderEditButton"} click={() => setAnc(tab)}>Edit Details</Button>}

            <Link className={"backToChals"} to={"/campaign"}>Back to categories</Link>
            <div className={"campInner"}>{challengeTab}</div>
        </SBTSection>
    </Page>;
};
