import { detectImportKind } from '../features/import/fileType';
import { parseOrderText } from '../features/import/parser';

export type WorkerImportJob =
  | {
      type: 'parse-text';
      text: string;
      title?: string;
    }
  | {
      type: 'detect-kind';
      fileName: string;
      mimeType: string;
    };

export type WorkerImportResult =
  | {
      type: 'parse-text';
      value: ReturnType<typeof parseOrderText>;
    }
  | {
      type: 'detect-kind';
      value: Awaited<ReturnType<typeof detectImportKind>>;
    };

export async function handleImportWorkerJob(job: WorkerImportJob): Promise<WorkerImportResult> {
  if (job.type === 'parse-text') {
    return {
      type: 'parse-text',
      value: parseOrderText(job.text, job.title)
    };
  }

  const kind = await detectImportKind(
    new File([], job.fileName, {
      type: job.mimeType
    })
  );

  return {
    type: 'detect-kind',
    value: kind
  };
}

export function canUseImportWorker(): boolean {
  return typeof Worker !== 'undefined' && typeof window !== 'undefined';
}
