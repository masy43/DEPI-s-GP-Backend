import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

export const getActiveSurvey = async (req: Request, res: Response) => {
  try {
    const survey = await prisma.survey.findFirst({
      where: { is_active: true },
      include: {
        questions: true
      }
    });

    if (!survey) {
      return res.status(404).json({ error: "No active survey found" });
    }

    res.json({ data: survey });
  } catch (err) {
    console.log("[survey] getActiveSurvey error:", err);
    res.status(500).json({ error: "Failed to fetch active survey" });
  }
};

export const submitSurvey = async (req: Request, res: Response) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "Answers array is required" });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Process and save answers
      for (const ans of answers) {
        if (!ans.question_id || !ans.answer_value) continue;

        await tx.survey_Response.create({
          data: {
            customer_id: customerId,
            question_id: ans.question_id,
            answer_value: ans.answer_value.toString()
          }
        });

        // 2. Fetch question mapping key
        const question = await tx.survey_Question.findUnique({
          where: { question_id: ans.question_id }
        });

        // 3. Update Skin Profile if mapping key matches
        if (question && question.mapping_key) {
          const key = question.mapping_key;
          let profile = await tx.skin_Profile.findUnique({ where: { customer_id: customerId } });
          
          if (!profile) {
             profile = await tx.skin_Profile.create({
               data: {
                 customer_id: customerId,
                 skin_type: "Not specified",
                 concerns: [],
                 sensitivity_level: "Not specified",
                 climate: "Not specified"
               }
             });
          }

          if (key === 'skin_type') {
            await tx.skin_Profile.update({ where: { profile_id: profile.profile_id }, data: { skin_type: ans.answer_value.toString() } });
          } else if (key === 'sensitivity_level') {
            await tx.skin_Profile.update({ where: { profile_id: profile.profile_id }, data: { sensitivity_level: ans.answer_value.toString() } });
          } else if (key === 'climate') {
             await tx.skin_Profile.update({ where: { profile_id: profile.profile_id }, data: { climate: ans.answer_value.toString() } });
          } else if (key === 'concerns') {
            // Merge concerns
            const currentConcerns = profile.concerns || [];
            if (!currentConcerns.includes(ans.answer_value.toString())) {
               await tx.skin_Profile.update({ where: { profile_id: profile.profile_id }, data: { concerns: { push: ans.answer_value.toString() } } });
            }
          }
        }
      }
    });

    res.status(201).json({ message: "Survey submitted successfully" });
  } catch (err) {
    console.log("[survey] submitSurvey error:", err);
    res.status(500).json({ error: "Failed to submit survey responses" });
  }
};
