import React from "react";

import { Page, SectionTitle2, HR, useApi, ENDPOINTS } from "ractf";

export default () => {
    const [backendVersion] = useApi(ENDPOINTS.VERSION);

    return <Page>
        <SectionTitle2>RACTF Debug Versions:</SectionTitle2>
        <HR />
        <div><code>ractf/shell</code> version: <code>{__COMMIT_HASH__}</code></div>
        <div><code>ractf/backend</code> version: <code>{backendVersion && backendVersion.commit_hash}</code></div>
    </Page>;
};
