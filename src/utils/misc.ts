import {Context} from '@actions/github/lib/context';
import {Octokit} from '@technote-space/github-action-helper/dist/types';
import {Utils, ApiHelper} from '@technote-space/github-action-helper';
import {PullRequestParams, DiffInfo} from '../types';

export const escape = (items: string[]): string[] => items.map(item => {
  // eslint-disable-next-line no-useless-escape
  if (!/^[A-Za-z0-9_\/-]+$/.test(item)) {
    item = '\'' + item.replace(/'/g, '\'\\\'\'') + '\'';
    item = item.replace(/^(?:'')+/g, '') // unduplicate single-quote at the beginning
      .replace(/\\'''/g, '\\\''); // remove non-escaped single-quote if there are enclosed between 2 escaped
  }
  return item;
});

export const getDiffInfoForPR = (pull: PullRequestParams, context: Context): DiffInfo => ({
  base: context.payload.action === 'closed' ? pull.base.sha : Utils.normalizeRef(pull.base.ref),
  head: context.payload.action === 'closed' ? context.sha : Utils.normalizeRef(context.ref),
});

export const isDefaultBranch = async(octokit: Octokit, context: Context): Promise<boolean> => await (new ApiHelper(octokit, context)).getDefaultBranch() === Utils.getBranch(context);

export const getDiffInfoForPush = async(octokit: Octokit, context: Context): Promise<DiffInfo> => {
  if (Utils.isTagRef(context)) {
    return {base: '', head: ''};
  }

  if (!await isDefaultBranch(octokit, context)) {
    const pull = await (new ApiHelper(octokit, context)).findPullRequest(context.ref);
    if (pull) {
      return {
        base: Utils.normalizeRef(pull.base.ref),
        head: `refs/pull/${pull.number}/merge`,
      };
    }
  }

  if (/^0+$/.test(context.payload.before)) {
    return {
      base: Utils.normalizeRef(await (new ApiHelper(octokit, context)).getDefaultBranch()),
      head: context.payload.after,
    };
  }

  return {
    base: context.payload.before,
    head: context.payload.after,
  };
};

export const getDiffInfo = async(octokit: Octokit, context: Context): Promise<DiffInfo> => context.payload.pull_request ? getDiffInfoForPR({
  base: context.payload.pull_request.base,
  head: context.payload.pull_request.head,
}, context) : await getDiffInfoForPush(octokit, context);
