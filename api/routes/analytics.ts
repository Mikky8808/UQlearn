import { Router, Request, Response } from 'express';

const courses: any[] = [];
const purchases: any[] = [];

const router = Router();

// GET instructor studio & platform analytics
router.get('/', (req: Request, res: Response) => {
  const totalRevenue = purchases.reduce((acc, p) => acc + p.amount, 74800.00);
  const totalLearners = courses.reduce((acc, c) => acc + c.learnersEnrolled, 105300);
  const totalReviews = courses.reduce((acc, c) => acc + c.reviewCount, 7460);
  const avgRating = courses.length > 0
    ? (courses.reduce((acc, c) => acc + c.rating, 0) / courses.length).toFixed(2)
    : '4.92';

  // 30-day daily revenue trend
  const dailyTrends = [
    { day: 'Day 1', revenue: 1800, learners: 24 },
    { day: 'Day 5', revenue: 2400, learners: 31 },
    { day: 'Day 10', revenue: 2100, learners: 28 },
    { day: 'Day 15', revenue: 3200, learners: 42 },
    { day: 'Day 20', revenue: 2900, learners: 38 },
    { day: 'Day 25', revenue: 3800, learners: 49 },
    { day: 'Day 30', revenue: 4500, learners: 58 }
  ];

  const monthlyRevenue = [
    { month: "Oct", revenue: 8400, learners: 820 },
    { month: "Nov", revenue: 9900, learners: 950 },
    { month: "Dec", revenue: 14200, learners: 1400 },
    { month: "Jan", revenue: 11800, learners: 1120 },
    { month: "Feb", revenue: 15600, learners: 1650 },
    { month: "Mar", revenue: 19400, learners: 2100 }
  ];

  const categoryBreakdown = [
    { name: "Development", value: 45 },
    { name: "Data Science", value: 25 },
    { name: "Design", value: 15 },
    { name: "Business", value: 10 },
    { name: "Marketing", value: 5 }
  ];

  res.json({
    totalRevenue,
    totalLearners,
    totalReviews,
    avgRating: parseFloat(avgRating),
    activeCourses: courses.length,
    dailyTrends,
    monthlyRevenue,
    categoryBreakdown
  });
});

export default router;
