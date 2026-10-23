with open("src/components/user/CourseEnrollmentPage.tsx", "r") as f:
    content = f.read()

old_effect = """  // Timer & Polling logic
  useEffect(() => {
    let timer: any = null;
    let poller: any = null;

    if (submittedSub && submittedSub.status === 'pending') {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setSubmittedSub(s => s ? { ...s, status: 'rejected' } : null);
            setStatusMessage('Request timed out. Please try again.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      poller = setInterval(async () => {
        try {
          const subs = await subscriptionService.getStudentSubscriptions(currentUser!.id);
          const found = subs.find(s => s.id === submittedSub.id);
          if (found && found.status !== 'pending') {
            setSubmittedSub(found);
            if (found.status === 'active') {
              setStatusMessage('Payment Confirmed!');
              enrollCourse(course!);
            } else {
              setStatusMessage('Payment Failed or Cancelled');
            }
            clearInterval(poller);
            clearInterval(timer);
          } else {
            // Check status via reference
            const reference = submittedSub.transactionCode; // In this setup transactionCode initially holds reference
            const statusRes = await payheroService.checkTransactionStatus(reference);
            
            if (statusRes.success && statusRes.status === 'SUCCESS') {
              const mpesaReceipt = statusRes.data?.response?.MpesaReceiptNumber || statusRes.data?.mpesa_receipt || statusRes.data?.MpesaReceiptNumber || 'Confirmed';
              setStatusMessage(`Payment successful! Receipt: ${mpesaReceipt}`);
              
              const updatedSub = { ...found!, status: 'active' as const, transactionCode: mpesaReceipt };
              await subscriptionService.activateSubscription(updatedSub.id, mpesaReceipt, 'M-Pesa Webhook automatically activated');
              
              setSubmittedSub(updatedSub);
              enrollCourse(course!);
              clearInterval(poller);
              clearInterval(timer);
            } else if (statusRes.success && statusRes.status === 'FAILED') {
              setStatusMessage(statusRes.message || 'Payment failed.');
              const updatedSub = { ...found!, status: 'rejected' as const };
              await subscriptionService.rejectSubscription(updatedSub.id, statusRes.message || 'Payment failed');
              setSubmittedSub(updatedSub);
              clearInterval(poller);
              clearInterval(timer);
            } else {
              setStatusMessage(statusRes.message || 'Waiting for M-Pesa PIN authorization...');
            }
          }
        } catch (err) {
          console.error(err);
        }
      }, 5000);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (poller) clearInterval(poller);
    };
  }, [submittedSub, currentUser, course, enrollCourse]);"""

new_effect = """  // Timer & Polling logic
  useEffect(() => {
    let timer: any = null;
    let poller: any = null;

    if (submittedSub && submittedSub.status === 'pending') {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setSubmittedSub(s => s ? { ...s, status: 'rejected' } : null);
            setStatusMessage('Request timed out. Please try again.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      poller = setInterval(async () => {
        if (!submittedSub || submittedSub.status !== 'pending') return;
        try {
          const subs = await subscriptionService.getStudentSubscriptions(currentUser!.id);
          const found = subs.find(s => s.id === submittedSub.id);
          if (found && found.status !== 'pending') {
            setSubmittedSub(found);
            if (found.status === 'active') {
              setStatusMessage('Payment Confirmed!');
              enrollCourse(course!);
            } else {
              setStatusMessage('Payment Failed or Cancelled');
            }
            clearInterval(poller);
            clearInterval(timer);
          } else {
            // Check status via reference
            const reference = submittedSub.transactionCode;
            const statusRes = await payheroService.checkTransactionStatus(reference);
            
            if (statusRes.success && statusRes.status === 'SUCCESS') {
              const mpesaReceipt = statusRes.data?.response?.MpesaReceiptNumber || statusRes.data?.mpesa_receipt || statusRes.data?.MpesaReceiptNumber || 'Confirmed';
              setStatusMessage(`Payment successful! Receipt: ${mpesaReceipt}`);
              
              const baseSub = found || submittedSub;
              const updatedSub = { ...baseSub, status: 'active' as const, transactionCode: mpesaReceipt };
              await subscriptionService.activateSubscription(updatedSub.id, mpesaReceipt, 'M-Pesa Webhook automatically activated');
              
              setSubmittedSub(updatedSub);
              enrollCourse(course!);
              clearInterval(poller);
              clearInterval(timer);
            } else if (statusRes.success && statusRes.status === 'FAILED') {
              setStatusMessage(statusRes.message || 'Payment failed.');
              const baseSub = found || submittedSub;
              const updatedSub = { ...baseSub, status: 'rejected' as const };
              await subscriptionService.rejectSubscription(updatedSub.id, statusRes.message || 'Payment failed');
              setSubmittedSub(updatedSub);
              clearInterval(poller);
              clearInterval(timer);
            } else {
              setStatusMessage(statusRes.message || 'Waiting for M-Pesa PIN authorization...');
            }
          }
        } catch (err) {
          console.error(err);
        }
      }, 5000);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (poller) clearInterval(poller);
    };
  }, [submittedSub?.id, submittedSub?.status, currentUser?.id, course?.id]);"""

if old_effect in content:
    content = content.replace(old_effect, new_effect)
    with open("src/components/user/CourseEnrollmentPage.tsx", "w") as f:
        f.write(content)
    print("Successfully updated poller effect")
else:
    print("Could not find old effect")
