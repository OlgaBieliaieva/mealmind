import type { ProfileSectionComponent } from "../profile-section.types";

import { Button, Card, Typography } from "@/shared/ui";

export const AccountSecuritySection: ProfileSectionComponent = () => {
  return (
    <section>
      <Card>
        <div className="profile-section profile-account-section">
          <div className="profile-account-section__content">
            <Typography as="h2" variant="section-title">
              Обліковий запис і безпека
            </Typography>

            <Typography variant="supporting">
              Керуйте даними входу, паролем та іншими налаштуваннями облікового запису.
            </Typography>
          </div>

          <Button type="button" variant="danger" disabled>
            Керувати обліковим записом
          </Button>
        </div>
      </Card>
    </section>
  );
};

AccountSecuritySection.sectionId = "account-security";
