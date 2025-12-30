// WOODPECKER_SERVER should be the base URL without /api (e.g., https://ci.techtonga.ro)
const getApiBase = () => {
    const server = process.env.WOODPECKER_SERVER || '';
    // Add /api if not already present
    return server.endsWith('/api') ? server : `${server}/api`;
};

export const APIS = {
    GET_PIPELINE_DETAIL: (repoId: string, pipelineId: string) => `${getApiBase()}/repos/${repoId}/pipelines/${pipelineId}`,
    GET_LOG_FOR_PIPELINE_STEP: (repoId: string, pipelineId: string, stepId: string ) => `${getApiBase()}/repos/${repoId}/logs/${pipelineId}/${stepId}`,
    GET_REPO_DETAILS: () => `${getApiBase()}/repos`,
    GET_PIPELINES: (repoId: string) => `${getApiBase()}/repos/${repoId}/pipelines`
}

export function ApiConfigFor (method: string) {
    return {
        method: method,
        headers: {
            "Authorization": `Bearer ${process.env.WOODPECKER_TOKEN}`,
            "Content-Type": "application/json",
        },
    }
}
