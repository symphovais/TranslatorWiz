import { selectNode, updateMultipleNodes } from '../services/node.service';

/**
 * Handle window size state request
 */
export async function handleGetWindowSizeState(): Promise<void> {
  const isCompact = await figma.clientStorage.getAsync('window-size-compact');
  figma.ui.postMessage({ type: 'window-size-state', isCompact: isCompact || false });
}

/**
 * Handle resize window request
 * @param width - New width
 * @param height - New height
 * @param isCompact - Whether the window is in compact mode
 */
export async function handleResizeWindow(
  width: number | undefined,
  height: number | undefined,
  isCompact: boolean | undefined
): Promise<void> {
  if (width && height) {
    try {
      figma.ui.resize(width, height);

      // Store the compact state
      if (isCompact !== undefined) {
        await figma.clientStorage.setAsync('window-size-compact', isCompact);
      }
    } catch (error) {
      console.error('Failed to resize window:', error);
    }
  } else {
    console.error('Invalid resize dimensions:', width, height);
  }
}

/**
 * Handle update multiple nodes request
 * @param nodeIds - Array of node IDs to update
 * @param newText - New text to apply
 */
export async function handleUpdateMultipleNodes(
  nodeIds: string[] | undefined,
  newText: string | undefined
): Promise<void> {
  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0 || newText === undefined) {
    figma.ui.postMessage({
      type: 'update-multiple-nodes-result',
      success: false,
      error: 'Invalid node IDs or text'
    });
    return;
  }

  const result = await updateMultipleNodes(nodeIds, newText);

  figma.ui.postMessage({
    type: 'update-multiple-nodes-result',
    success: result.success,
    count: result.count,
    errors: result.errors,
    error: result.error
  });
}

/**
 * Handle select node request
 * @param nodeId - ID of node to select
 */
export async function handleSelectNode(nodeId: string | undefined): Promise<void> {
  if (!nodeId) {
    return;
  }

  await selectNode(nodeId);
}

/**
 * Handle cancel/close plugin request
 */
export function handleCancel(): void {
  figma.closePlugin();
}
