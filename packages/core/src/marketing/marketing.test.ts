import { describe, expect, it } from "vitest";
import { ValidationError, type Clock } from "../shared";
import {
  CaptchaFailedError,
  SubmitDemoRequest,
  type CaptchaVerifier,
  type DemoRequestInput,
  type Lead,
  type LeadRepository,
} from "./index";

const NOW = new Date("2026-11-17T12:00:00Z");
const clock: Clock = { now: () => NOW };

function setup(captchaPasses = true) {
  const saved: Lead[] = [];
  const leads: LeadRepository = { save: async (lead) => void saved.push(lead) };
  const captcha: CaptchaVerifier = { verify: async () => captchaPasses };
  return { saved, useCase: new SubmitDemoRequest(leads, captcha, clock) };
}

const validRequest: DemoRequestInput = {
  fullName: "Rosa Quispe",
  companyName: "Ferretería El Clavo SAC",
  ruc: "",
  jobTitle: "Gerente general",
  email: "rosa@elclavo.pe",
  phone: "987 654 321",
  sector: "Cemento, fierro y agregados",
  sellsToGovernment: "not_sure",
  website: "",
  captchaToken: "token",
};

describe("SubmitDemoRequest", () => {
  it("saves a normalized lead", async () => {
    const { saved, useCase } = setup();
    await useCase.execute(validRequest, { ip: "190.0.0.1" });

    expect(saved).toEqual([
      {
        fullName: "Rosa Quispe",
        companyName: "Ferretería El Clavo SAC",
        ruc: null,
        jobTitle: "Gerente general",
        email: "rosa@elclavo.pe",
        phone: "+51987654321",
        sector: "Cemento, fierro y agregados",
        sellsToGovernment: "not_sure",
        source: "demo_form",
        createdAt: NOW,
      },
    ]);
  });

  it("rejects bots that fill the honeypot", async () => {
    const { saved, useCase } = setup();
    await expect(
      useCase.execute({ ...validRequest, website: "http://spam" }, { ip: null }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(saved).toHaveLength(0);
  });

  it("rejects a failed captcha", async () => {
    const { saved, useCase } = setup(false);
    await expect(useCase.execute(validRequest, { ip: null })).rejects.toBeInstanceOf(
      CaptchaFailedError,
    );
    expect(saved).toHaveLength(0);
  });

  it("validates an optional RUC when present", async () => {
    const { useCase } = setup();
    const error = await useCase.execute({ ...validRequest, ruc: "123" }, { ip: null }).then(
      () => null,
      (rejection: unknown) => rejection,
    );
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fieldErrors).toHaveProperty("ruc");
  });
});
