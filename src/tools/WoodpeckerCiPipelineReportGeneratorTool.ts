import { logger, MCPTool } from "mcp-framework";
import {getLogForPipelineStep, getPipelineResult} from "./helpers/woodpeckerCI.js";
import {pipelineDetailSchema} from "../Schema/pipelineDetail.js";
import { SimpleCache } from "./helpers/cache.js";

interface WoodpeckerCiPipelineReportGeneratorInput {
	repoId: string;
	pipelineNumber: string;
}

const pipelineLogCache = new SimpleCache<any>(2 * 60 * 60 * 1000); // 2 hours cache

class WoodpeckerCiPipelineReportGeneratorTool extends MCPTool<WoodpeckerCiPipelineReportGeneratorInput> {
	name = "woodpecker-ci-pipeline-report-generator";
	description = "This tool is used to extract all the different machine logs for the given pipeline"

	schema = pipelineDetailSchema;

	async execute(input: WoodpeckerCiPipelineReportGeneratorInput): Promise<string> {
		const {pipelineNumber, repoId} = input;
		const cacheKey = `${repoId}:${pipelineNumber}`;

		try {
			// check cache first
			if (pipelineLogCache.has(cacheKey)) {
				logger.info('Returning cached pipeline log for key: ' + cacheKey);
				return pipelineLogCache.get(cacheKey);
			}

			// check failure first
			const pipelineResult = await getPipelineResult(repoId, pipelineNumber);

			// Check if pipeline is still running
			const status = (pipelineResult as any).status;
			if (status === 'running' || status === 'pending') {
				// Don't cache running pipelines
				return `Pipeline ${pipelineNumber} is currently ${status}. Please wait for it to complete.`;
			}

			if (pipelineResult.isSuccess) {
				const response = `Pipeline ${pipelineNumber} for PR ${pipelineResult.pullRequestUrl} completed successfully. No failed steps detected.`;
				pipelineLogCache.set(cacheKey, response);
				return response;
			}

			if (pipelineResult.error?.includes("Failed to fetch")) {
				const response = pipelineResult.error;
				pipelineLogCache.set(cacheKey, response);
				return response;
			}

			// If the pipeline failed, we need to fetch the logs for each failed step
			const stepDetails = pipelineResult.failedStepDetails;
			const logDetails = await getLogForPipelineStep(repoId, pipelineNumber, stepDetails);

			const response = `Pipeline ${pipelineNumber} for PR ${pipelineResult.pullRequestUrl} has failed.\n\nFailed steps details:\n${JSON.stringify(logDetails, null, 2)}`;
			pipelineLogCache.set(cacheKey, response);
			return response;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `Error analyzing pipeline ${pipelineNumber}: ${errorMessage}`;
		}
	}
}

export default WoodpeckerCiPipelineReportGeneratorTool;