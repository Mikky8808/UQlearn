export type UserRole = 'learner' | 'student' | 'instructor' | 'reviewer' | 'course_reviewer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  phone?: string;
  country?: string;
  city?: string;
  referralCode?: string;
  marketingOptIn?: boolean;
  isVerified?: boolean;
  enrolledCourseIds?: string[];
  wishlist?: string[];
  token?: string;
  sessionExpiresAt?: number;
  loginTimestamp?: number;
  signature?: string;
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoUrl?: string;
  videoPath?: string;
  content: string;
  type?: 'video' | 'article' | 'quiz' | 'audio' | 'scorm';
  isPreview?: boolean;
  isCompleted?: boolean;
  resources?: any[];
  quiz?: Quiz;
  quizData?: any;
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  instructor: string;
  instructorTitle: string;
  instructorAvatar: string;
  createdBy?: string;
  created_by?: string;
  creatorEmail?: string;
  category: 'Development' | 'Business' | 'Design' | 'Data Science' | 'Marketing' | 'Personal Growth' | string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels' | string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  learnersEnrolled: number;
  learnersCount?: number;
  image: string;
  thumbnail?: string;
  duration: string;
  modules: Module[];
  modulesCount?: number;
  lessonsCount?: number;
  sections?: any[];
  updatedAt: string;
  bestSeller?: boolean;
  isPremium?: boolean;
  isSponsored?: boolean;
  sponsoredAdId?: number | string;
  isPublished?: boolean;
  isApprovedByAdmin?: boolean;
  reviewStatus?: 'pending_review' | 'under_review' | 'approved' | 'rejected' | 'needs_changes';
  assignedReviewerId?: string;
  assignedReviewerName?: string;
  assignedReviewerEmail?: string;
  assigned_reviewer_id?: string;
  assigned_reviewer_name?: string;
  assigned_reviewer_email?: string;
  reviewerNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  subcategory?: string;
  primaryTaught?: string;
  language?: string;
  promoVideo?: string;
  instructorDescription?: string;
  instructor_description?: string;
  instructorBio?: string;
  instructorImage?: string;
  learningOutcomes?: string[];
  whatYouWillLearn?: string[];
  learningObjectives?: string[];
  requirements?: string[];
  targetLearners?: string[];
}

export type RequestSenderType = 'user' | 'instructor' | 'admin';
export type RequestRecipientType = 'instructor' | 'admin';
export type RequestStatus = 'pending' | 'approved' | 'declined' | 'in_review';

export interface CommunicationRequest {
  id: string;
  senderType: RequestSenderType;
  senderId?: string;
  senderName: string;
  senderEmail: string;
  recipientType: RequestRecipientType;
  recipientId?: string;
  courseId?: string;
  courseTitle?: string;
  type: 'mentorship' | 'extension' | 'resource' | 'certificate' | 'payout' | 'sponsorship' | 'approval' | 'support' | 'custom';
  title: string;
  details: string;
  date: string;
  createdAt?: string;
  status: RequestStatus;
  replyNote?: string;
  repliedAt?: string;
  repliedBy?: string;
}

export interface MessageReply {
  id: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  timestamp: string;
}

export interface Message {
  id: string;
  courseId?: string;
  courseTitle?: string;
  learnerName: string;
  instructorName: string;
  subject: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  replies: MessageReply[];
}

export interface Purchase {
  id: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  paymentMethod: string;
  date: string;
  status: 'success' | 'pending';
}

export interface AnalyticsData {
  totalRevenue: number;
  totalLearners: number;
  activeCourses: number;
  avgRating: number;
  monthlyRevenue: { month: string; revenue: number; learners: number }[];
  categoryBreakdown: { name: string; value: number }[];
}

export interface LearnerNote {
  id: string;
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  timestamp: string; // e.g. "04:15"
  content: string;
  createdAt: string;
}

export interface QuestionReply {
  id: string;
  authorName: string;
  authorRole: UserRole;
  authorAvatar?: string;
  content: string;
  timestamp: string;
  isInstructor?: boolean;
}

export interface LearnerQuestion {
  id: string;
  courseId: string;
  courseTitle: string;
  learnerId?: string;
  learnerName?: string;
  studentId?: string;
  studentName?: string;
  learnerAvatar?: string;
  studentAvatar?: string;
  title: string;
  content: string;
  timestamp: string;
  upvotes: number;
  hasUpvoted?: boolean;
  replies: QuestionReply[];
}

export type StudentQuestion = LearnerQuestion;

export interface CourseResource {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  type: 'pdf' | 'code' | 'slides' | 'cheatsheet';
  size: string;
  downloadUrl: string;
  description: string;
}

export interface CertificateItem {
  id: string;
  credentialId: string;
  courseId: string;
  courseTitle: string;
  learnerName?: string;
  studentName?: string;
  completionDate: string;
  instructorName: string;
  grade: string;
  skills: string[];
}

export interface BadgeItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  dateEarned: string;
  isUnlocked: boolean;
}

export interface AnnouncementItem {
  id: string;
  courseId: string;
  courseTitle: string;
  instructorName: string;
  instructorAvatar?: string;
  title: string;
  content: string;
  date: string;
  unread: boolean;
}

export interface LearnerRosterItem {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  country: string;
  enrolledCourseId: string;
  enrolledCourseTitle: string;
  enrollmentDate: string;
  lastActiveDate: string;
  progressPercent: number;
  lastLectureViewed: string;
  questionsCount: number;
  status: 'Active' | 'Falling Behind' | 'Completed' | 'Inactive';
}

export interface CustomList {
  id: string;
  name: string;
  description: string;
  courseIds: string[];
  createdAt: string;
}

export interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  subCategories?: string[];
  bannerImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseConfigDefaults {
  autoPublish: boolean;
  defaultCommissionRate: number;
  minimumPrice: number;
  maximumPrice: number;
  allowFreeCourses: boolean;
  requireAiAudit: boolean;
  allowedVideoFormats: string[];
  maxVideoSizeMb: number;
  defaultLevel: string;
  ceoName?: string;
  ceoTitle?: string;
  ceoSignature?: string;
}

export interface HeroBanner {
  id: string;
  imageUrl: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
}

export type NotificationStatus = 'pending' | 'accepted' | 'declined' | 'dismissed';

export interface InstructorNotification {
  id: string;
  instructorName?: string;
  instructorEmail?: string;
  courseId: string;
  courseTitle: string;
  courseThumbnail?: string;
  category?: string;
  type: 'price_adjustment' | 'system' | 'quality' | 'general';
  title: string;
  message: string;
  suggestedPrice?: number;
  currentPrice?: number;
  flagReason?: string;
  status?: NotificationStatus;
  createdAt: string;
  reminderSentAt?: string;
  resolvedAt?: string;
  read: boolean;
}

export interface InstructorCompliance {
  id: string;
  instructorId: string;
  instructorName: string;
  videoUrl: string;
  summary: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
}

export interface CourseSubscription {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  coursePrice: number;
  amount?: number;
  amountKes?: number;
  amountUsd?: number;
  currency?: string;
  paymentMethod: 'manual' | 'online' | 'free' | 'payhero_stk';
  phoneNumber?: string;
  transactionCode: string;
  mpesaReceipt?: string;
  externalReference?: string;
  status: 'pending' | 'active' | 'rejected' | 'expired' | 'FAILED' | 'QUEUED';
  enrolledAt: string;
  activatedAt?: string;
  activatedBy?: string;
  notes?: string;
}

export interface StudentCourseProgress {
  id: string;
  studentId: string;
  courseId: string;
  completedLessonIds: string[];
  lastLessonId?: string;
  progressPercent: number;
  updatedAt: string;
}

export interface WithdrawalTransaction {
  id: string;
  instructorId: string;
  instructorEmail: string;
  instructorName?: string;
  amount: number;
  currency: string;
  bankName: string;
  accountNumber: string;
  accountName?: string;
  country?: string;
  status: 'pending' | 'processing' | 'settled' | 'declined';
  requestedAt: string;
  settledAt?: string;
  reference?: string;
  notes?: string;
  estimatedSettlementDays?: string;
}

export interface PayoutCountry {
  id: string;
  name: string;
  code: string;
  currencyCode: string;
  currencySymbol: string;
  payoutMethods: string[];
  minPayout: number;
  processingTime: string;
  isActive: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayoutBank {
  id: string;
  countryId: string;
  countryName?: string;
  name: string;
  code?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TopAdvert {
  id: number | string;
  imageUrl: string;
  image_url?: string;
  linkUrl?: string;
  link_url?: string;
  title?: string;
  altText?: string;
  alt_text?: string;
  bgColor?: string;
  bg_color?: string;
  isActive: boolean;
  is_active?: number | boolean;
  displayOrder: number;
  display_order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Advert {
  id: number | string;
  slot: 'super_deals' | 'tailored_for_you' | 'deals' | 'tailored' | string;
  imageUrl: string;
  image_url?: string;
  linkUrl?: string;
  link_url?: string;
  title?: string;
  subtitle?: string;
  altText?: string;
  alt_text?: string;
  badgeText?: string;
  badge_text?: string;
  bgColor?: string;
  bg_color?: string;
  isActive: boolean;
  is_active?: number | boolean;
  displayOrder?: number;
  display_order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SponsoredPricingPlan {
  id: string;
  name: string;
  description?: string;
  durationDays: number;
  duration_days?: number;
  price: number;
  badgeTag?: string;
  badge_tag?: string;
  features: string[];
  isActive?: boolean;
  is_active?: number | boolean;
  displayOrder?: number;
  display_order?: number;
}

export interface SponsoredAd {
  id: number | string;
  courseId: string;
  course_id?: string;
  instructorId: string;
  instructor_id?: string;
  instructorName?: string;
  instructorEmail?: string;
  courseTitle?: string;
  courseThumbnail?: string;
  coursePrice?: number;
  planId: string;
  planName: string;
  durationDays: number;
  amountPaid: number;
  currency: string;
  paymentMethod?: string;
  paymentStatus: 'completed' | 'pending' | 'free_admin' | string;
  status: 'active' | 'pending_approval' | 'paused' | 'expired' | 'rejected' | string;
  startDate: string;
  endDate: string;
  impressionsCount: number;
  clicksCount: number;
  adminNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}



