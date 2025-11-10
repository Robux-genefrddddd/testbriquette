import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export function useActiveLicense(user: User | null) {
  const [hasActiveLicense, setHasActiveLicense] = useState<boolean | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasActiveLicense(false);
      setLoading(false);
      return;
    }

    // Query licenses where ownerUid matches current user and active is true
    const q = query(
      collection(db, "licenses"),
      where("ownerUid", "==", user.uid),
      where("active", "==", true),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setHasActiveLicense(!snapshot.empty);
        setLoading(false);
      },
      (error) => {
        console.error("Error checking license:", error);
        setHasActiveLicense(false);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [user]);

  return { hasActiveLicense, loading };
}
