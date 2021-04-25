
import React, { useState, useCallback, useContext } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { FiThumbsUp, FiThumbsDown } from "react-icons/fi";

import {
    Button, Input, InputButton, Form, Row, Modal, Markdown, HR, UiKitModals, Container
} from "@ractf/ui-kit";
import { attemptFlag, reloadAll } from "@ractf/api";
import { escapeRegex } from "@ractf/util";
import { useConfig } from "@ractf/shell-util";
import * as http from "@ractf/util/http";

import { editChallenge } from "actions";
import { incrementSolveCount } from "@ractf/api"
import Link from "components/Link";


const FlagForm = ({ challenge, onFlagResponse, autoFocus, submitRef }) => {
    const [flagValid, setFlagValid] = useState(false);
    const [feedback, setFeedback] = useState(false);
    const [message, setMessage] = useState(null);
    const [correct, setCorrect] = useState(false);
    const [locked, setLocked] = useState(false);
    const flag_prefix = useConfig("flag_prefix", "flag");
    const dispatch = useDispatch();

    const modals = useContext(UiKitModals);

    const { t } = useTranslation();

    const flagRegex = () => {
        let regex = challenge.challenge_metadata.flag_regex;
        let partial = challenge.challenge_metadata.flag_partial_regex;
        let format_string;
        if (!regex || !partial) {
            regex = new RegExp("^" + escapeRegex(flag_prefix) + "{.+}$");
            partial = "";
            for (let i = 0; i < flag_prefix.length; i++) {
                partial += "(?:" + escapeRegex(flag_prefix[i]) + "|$)";
            }
            partial = new RegExp("^" + partial + "(?:{|$)(?:[^}]+|$)(?:}|$)$");
            format_string = flag_prefix + "{...}";
        } else {
            format_string = regex.toString();
        }
        return [regex, partial, format_string];
    };
    const [regex, partial, format_string] = flagRegex();

    const changeFlag = (flag) => {
        if (challenge.challenge_type === "freeform" || challenge.challenge_type === "longText")
            return setFlagValid(!!flag);
        setFlagValid(regex.test(flag));
    };

    const tryFlag = useCallback(({ flag }) => {
        setLocked(true);
        setMessage(null);
        attemptFlag(flag, challenge).then(resp => {
            if (resp.correct) {
                setCorrect(true);
                if (onFlagResponse)
                    onFlagResponse(true);
                challenge.solved = true;

                // NOTE: This is potentially very slow. If there are performance issues in production, this is
                // where to look first!
                reloadAll();
                /*  // This is the start of what would be the code to rebuild the local cache
                api.challenges.forEach(group => group.chals.forEach(chal => {
                    if (chal.deps.indexOf(challenge.id) !== -1) {
                        chal.lock = false;
                    }
                }));
                */
            } else {
                modals.alert("Incorrect flag");
            }
            setLocked(false);
        }).catch(e => {
            console.error(e);
            setMessage(http.getError(e));
            if (onFlagResponse)
                onFlagResponse(false, http.getError(e));
            setLocked(false);
        });
    }, [challenge, modals, onFlagResponse]);
    const rateNone = useCallback(() => { setCorrect(false); setFeedback(false); }, []);
    const vote = (positive) => {
        http.post("/challenges/vote", { challenge: challenge.id, positive }).catch(e => {
            console.error(e);
            modals.alert("Error submitting vote:\n" + http.getError(e));
        }).then(() => {
            const newVotes = { ...(challenge.votes || {}), self: positive };
            dispatch(editChallenge({ id: challenge.id, votes: newVotes }));
            //challenge.votes = newVotes;
        });
        setFeedback(false);
        setCorrect(false);
    };
    const openFeedback = useCallback(() => setFeedback(true), []);

    if (submitRef) submitRef.current = tryFlag;

    let flagInput = null;
    let button = true;
    switch (challenge.challenge_type) {
        case "code":
            break;
        case "map":
            break;
        case "freeform":
            flagInput = <Input placeholder="Flag"
                name={"flag"} onChange={changeFlag}
                light monospace autoFocus={autoFocus}
                center width={"80%"} error={message} />;
            break;
        case "longText":
            flagInput = <Input rows={5} placeholder="Flag text"
                format={partial} name={"flag"} autoFocus={autoFocus}
                onChange={changeFlag} light monospace
                center width={"80%"} error={message} />;
            break;
        default:
            flagInput = <InputButton placeholder={"Flag format: " + format_string}
                format={partial} name={"flag"} autoFocus={autoFocus} center
                onChange={changeFlag} light monospace error={message}
                button={t("challenge.attempt")} btnDisabled={!flagValid} />;
            button = false;
            break;
    }

    return <>
        {correct && <Modal onClose={rateNone} cancel={false} okay={false} transparent
            header={"Flag correct!"} buttons={<>
                <Button onClick={rateNone} lesser>No thanks</Button>
            </>}>
            {challenge.post_score_explanation && <>
                Here's a little extra the challenge author had to say:
                <HR />
                <Markdown LinkElem={Link} source={challenge.post_score_explanation} />
                <HR />
            </>}
            <h6>Rate this challenge:</h6>
            <Container toolbar full centre>
                <Button onClick={() => vote(true)} success Icon={FiThumbsUp}>Awesome</Button>
                <Button onClick={() => vote(false)} danger Icon={FiThumbsDown}>Not great</Button>
            </Container>
        </Modal>}
        {feedback && <Modal onClose={rateNone} cancel={false} okay={false} transparent
            header={"Rate this challenge:"} buttons={<>
                <Button onClick={rateNone} lesser>No thanks</Button>
            </>}>
            <Container toolbar full centre>
                <Button onClick={() => vote(true)} success Icon={FiThumbsUp} lesser={challenge.votes?.self === false}>
                    Awesome
                </Button>
                <Button onClick={() => vote(false)} danger Icon={FiThumbsDown} lesser={challenge.votes?.self === true}>
                    Not great
                </Button>
            </Container>
        </Modal>}

        {challenge.solved ? (<Row>
            <span>{t("challenge.already_solved")} <span className={"linkStyle"} onClick={openFeedback}>
                Want to submit feedback?
            </span></span>
        </Row>) : (
                <Form handle={tryFlag} locked={locked}>
                    {flagInput && <>
                        {flagInput}
                        {button && (
                            <Button disabled={!flagValid} submit>{t("challenge.attempt")}</Button>
                        )}
                    </>}
                </Form>
            )}
    </>;
};
export default React.memo(FlagForm);

