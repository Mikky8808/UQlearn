import React, { useState, useEffect } from 'react';
import { Video, AlertCircle, RefreshCw } from 'lucide-react';
import { InstructorCompliance } from '../../types';
import { apiFetch } from '../../lib/apiConfig';
import { ResumableVideoUploader } from '../common/ResumableVideoUploader';

interface InstructorComplianceTabProps {
  currentUser?: {
    id: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
  };
}

export const InstructorComplianceTab: React.FC<InstructorComplianceTabProps> = ({ currentUser }) => {
  const [summary, setSummary] = useState('');
  const [submittedRecord, setSubmittedRecord] = useState<InstructorCompliance | null>(null);
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const instructorId = currentUser?.id || 'me';
  const instructorName = currentUser?.name || `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim() || 'Instructor';

  useEffect(() => {
    const fetchExistingCompliance = async () => {
      setIsInitialLoading(true);
      try {
        const data = await apiFetch('compliance-manage.php');
        if (Array.isArray(data)) {
          // Find submission for current instructor
          const mySubmission = data.find((item: any) => item.instructor_id === instructorId);
          if (mySubmission) {
            setSubmittedRecord({
              id: mySubmission.id,
              instructorId: mySubmission.instructor_id,
              instructorName: mySubmission.instructor_name || instructorName,
              videoUrl: mySubmission.file_path,
              summary: mySubmission.summary,
              status: mySubmission.status,
              createdAt: mySubmission.created_at,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching compliance submissions:', err);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchExistingCompliance();
  }, [instructorId, instructorName]);

  const handleComplianceSubmission = async (filePath: string) => {
    setIsSubmittingRecord(true);
    
    try {
      // Save the record to the database via compliance-manage.php
      const dbData = await apiFetch('compliance-manage.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'submit',
          instructor_id: instructorId,
          file_path: filePath,
          summary: summary,
        }),
      });

      const newRecord: InstructorCompliance = {
        id: dbData.id,
        instructorId: dbData.instructor_id,
        instructorName: instructorName,
        videoUrl: dbData.file_path,
        summary: dbData.summary,
        status: dbData.status,
        createdAt: dbData.created_at || new Date().toISOString(),
      };
      setSubmittedRecord(newRecord);
    } catch (error: any) {
      console.error('Error saving compliance record:', error);
      alert(error.message || 'Upload succeeded but failed to save compliance record.');
    } finally {
      setIsSubmittingRecord(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500 font-bold">Checking compliance status...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Instructor Compliance</h2>
      
      {submittedRecord ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-bold mb-4">Your Submission</h3>
          <table className="w-full text-sm text-left">
            <thead className="text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="pb-3">Video/Summary</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200 dark:border-slate-800">
                <td className="py-3 pr-4">
                  <a href={submittedRecord.videoUrl} target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline block mb-1">
                    <Video className="inline w-4 h-4 mr-1"/> View Content
                  </a>
                  <span className="text-slate-600 dark:text-slate-400 text-xs">{submittedRecord.summary || 'No summary provided.'}</span>
                </td>
                <td className="py-3 pr-4 capitalize font-bold text-amber-600">{submittedRecord.status}</td>
                <td className="py-3">{new Date(submittedRecord.createdAt).toLocaleDateString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Your instructor profile requires compliance review. Please upload a video demonstrating your teaching capabilities and providing a summary of your expertise.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">1. Teaching Summary & Expertise</label>
                <textarea 
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl outline-none transition-all dark:text-white h-32 text-sm focus:border-indigo-500"
                  placeholder="Briefly describe your professional background, teaching style, and why you're a great fit for our learners..."
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">2. Upload Demonstration Video</label>
                <ResumableVideoUploader
                  mode="inline"
                  folder="compliance"
                  userId={instructorId}
                  label="Upload Video"
                  description="Upload a 2-5 minute video of yourself teaching a concept or introducing your course."
                  onUploadComplete={(result) => handleComplianceSubmission(result.url || result.file_path)}
                />
              </div>
            </div>

            {isSubmittingRecord && (
              <div className="flex items-center justify-center space-x-2 text-indigo-600 font-bold text-xs animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Finalizing your submission...</span>
              </div>
            )}

            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900">
              <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                <strong>Note:</strong> Your video will be reviewed by our quality team. High-quality audio and clear presentation significantly increase your chances of approval. Once submitted, your profile status will move to 'Pending'.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
