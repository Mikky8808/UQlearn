import { Router, Request, Response } from 'express';

export interface Purchase {
  id: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  paymentMethod: string;
  date: string;
  status: 'success' | 'pending' | 'failed';
}

let purchases: Purchase[] = [];
let coupons: any[] = [];
const courses: any[] = [];

const router = Router();

// GET all purchases / transactions
router.get('/', (req: Request, res: Response) => {
  res.json(purchases);
});

// POST make a purchase / enroll
router.post('/', (req: Request, res: Response) => {
  const { courseId, courseTitle, amount, paymentMethod, couponCode } = req.body;

  let finalAmount = Number(amount) || 89.99;

  // Apply coupon if valid
  if (couponCode) {
    const coupon = coupons.find(c => c.code.toLowerCase() === couponCode.toLowerCase() && c.isActive);
    if (coupon) {
      finalAmount = finalAmount * (1 - coupon.discountPercent / 100);
      coupon.usageCount += 1;
    }
  }

  const newPurchase: Purchase = {
    id: `tx-${Math.floor(1000 + Math.random() * 9000)}`,
    courseId: courseId || 'course-1',
    courseTitle: courseTitle || 'UQlearn Course Enrollment',
    amount: parseFloat(finalAmount.toFixed(2)),
    paymentMethod: paymentMethod || 'Credit Card (•••• 4242)',
    date: new Date().toISOString().split('T')[0],
    status: 'success'
  };

  purchases.unshift(newPurchase);

  // Increment enrolled learners on matching course
  const course = courses.find(c => c.id === courseId);
  if (course) {
    course.learnersEnrolled += 1;
  }

  res.status(201).json(newPurchase);
});

// GET coupon verification
router.get('/coupon/:code', (req: Request, res: Response) => {
  const { code } = req.params;
  const coupon = coupons.find(c => c.code.toLowerCase() === code.toLowerCase());

  if (!coupon) {
    return res.status(404).json({ valid: false, error: 'Invalid coupon code' });
  }

  if (!coupon.isActive || coupon.usageCount >= coupon.maxUsage) {
    return res.status(400).json({ valid: false, error: 'Coupon code has expired or reached maximum claims' });
  }

  res.json({
    valid: true,
    code: coupon.code,
    discountPercent: coupon.discountPercent
  });
});

export default router;
