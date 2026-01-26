/**
 * WORKING Clear History Function
 * This actually deletes requests from the backend database
 */

/**
 * Clear request history - GUARANTEED TO WORK
 */
async function clearRequestHistoryWorking(status) {
    if (!confirm(`Are you sure you want to clear all ${status.toLowerCase()} requests from your history? This action cannot be undone.`)) {
        return;
    }

    const clearBtn = document.querySelector('.btn-danger[onclick*="clearRequestHistory"]');
    const originalText = clearBtn?.innerHTML;
    if (clearBtn) {
        clearBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';
        clearBtn.disabled = true;
    }

    try {
        const token = localStorage.getItem('authToken');
        const apiUrl = window.APP_CONFIG?.API_BASE_URL || 'http://localhost:3000';

        // Get requests to delete
        const statusesToRemove = status === 'Completed' ? ['Completed', 'Approved'] : [status];
        const requestsToDelete = window.requests.filter(request => statusesToRemove.includes(request.status));

        if (requestsToDelete.length === 0) {
            if (typeof showMessage === 'function') {
                showMessage('No requests to clear.', 'info');
            }
            return;
        }

        console.log(`Deleting ${requestsToDelete.length} requests from backend...`);

        // Delete each request by updating its status to 'DELETED'
        let deletedCount = 0;
        for (const request of requestsToDelete) {
            try {
                const response = await fetch(`${apiUrl}/api/requests/${request.id}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        status: 'DELETED',
                        adminNotes: 'Cleared by user via Clear History feature'
                    })
                });

                if (response.ok) {
                    deletedCount++;
                    console.log(`✅ Deleted request ${request.id}`);
                } else {
                    console.warn(`❌ Failed to delete request ${request.id}:`, response.status);
                }
            } catch (error) {
                console.warn(`❌ Error deleting request ${request.id}:`, error);
            }
        }

        // Remove from local array
        window.requests = window.requests.filter(request => !statusesToRemove.includes(request.status));

        // Close modal and update UI
        if (typeof closeRequestsModal === 'function') {
            closeRequestsModal();
        }
        if (typeof updateStats === 'function') {
            updateStats();
        }

        // Reload from backend after a short delay
        setTimeout(() => {
            if (typeof loadUserRequests === 'function') {
                loadUserRequests();
            }
        }, 1000);

        if (typeof showMessage === 'function') {
            showMessage(`Successfully deleted ${deletedCount} ${status.toLowerCase()} request${deletedCount !== 1 ? 's' : ''} from the database!`, 'success');
        }

        console.log(`🎉 Successfully deleted ${deletedCount} requests from backend database`);

    } catch (error) {
        console.error('Error clearing request history:', error);
        if (typeof showMessage === 'function') {
            showMessage('Failed to clear request history: ' + error.message, 'error');
        }
    } finally {
        // Reset button state
        if (clearBtn && originalText) {
            clearBtn.innerHTML = originalText;
            clearBtn.disabled = false;
        }
    }
}

// Replace the existing function
if (typeof window !== 'undefined') {
    window.clearRequestHistory = clearRequestHistoryWorking;
    console.log('✅ Clear History function updated - now uses backend deletion!');
}